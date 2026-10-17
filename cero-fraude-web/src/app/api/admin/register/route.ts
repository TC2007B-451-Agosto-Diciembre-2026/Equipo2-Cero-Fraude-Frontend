import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

type Role = {
  id: number;
  code: string;
};

type BackendError = {
  message?: string | string[];
};

// Creates an account that is already an administrator. The backend has no
// endpoint for that (POST /auth/register always creates a USER), so this
// handler chains two existing endpoints:
//   1. POST /auth/register with the new credentials
//   2. PATCH /users/:id { role_id: ADMIN } with the caller's admin token
// The new account's tokens never leave the server.
export async function POST(request: NextRequest) {
  // Same CSRF check as the backend proxy.
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json(
      { message: "Origen no permitido." },
      { status: 403 }
    );
  }

  const session = await getAdminSession(request);

  if ("error" in session) return session.error;

  let body: { username?: unknown; email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return withSession(
      NextResponse.json({ message: "Solicitud inválida." }, { status: 400 }),
      session.refreshedToken
    );
  }

  const registerResponse = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: body.username,
      email: body.email,
      password: body.password,
    }),
    cache: "no-store",
  });

  if (!registerResponse.ok) {
    // 400 (validation) and 409 (duplicate) keep the backend message.
    const error = (await registerResponse
      .json()
      .catch(() => ({}))) as BackendError;

    return withSession(
      NextResponse.json(
        { message: error.message ?? "No fue posible crear la cuenta." },
        { status: registerResponse.status }
      ),
      session.refreshedToken
    );
  }

  const tokens = await registerResponse.json();
  const userId = getTokenSubject(tokens.access_token);

  const promoteResponse = userId
    ? await fetch(`${API_URL}/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ role_id: session.adminRoleId }),
        cache: "no-store",
      })
    : null;

  if (!promoteResponse?.ok) {
    // The account exists but stayed a regular user. There is no
    // DELETE /users, so the UI tells the admin to promote it from Usuarios.
    return withSession(
      NextResponse.json(
        {
          message:
            "La cuenta se creó, pero no se le pudo dar el rol de administrador. Promuévela desde Usuarios.",
          created_user_id: userId,
        },
        { status: 502 }
      ),
      session.refreshedToken
    );
  }

  const user = await promoteResponse.json();

  return withSession(
    NextResponse.json(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
      { status: 201 }
    ),
    session.refreshedToken
  );
}

type AdminSession =
  | { token: string; adminRoleId: number; refreshedToken: string | null }
  | { error: NextResponse };

// Checks the caller is still an admin before creating anything. GET /roles is
// admin only, and it also gives the ADMIN role ID (resolved by code).
async function getAdminSession(request: NextRequest): Promise<AdminSession> {
  const accessToken = request.cookies.get("cf_access_token")?.value;
  const refreshToken = request.cookies.get("cf_refresh_token")?.value;

  let token = accessToken ?? null;
  let refreshedToken: string | null = null;
  let rolesResponse = token ? await fetchRoles(token) : null;

  if ((!rolesResponse || rolesResponse.status === 401) && refreshToken) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (refreshResponse.ok) {
      const data = await refreshResponse.json();
      token = data.access_token;
      refreshedToken = data.access_token;
      rolesResponse = await fetchRoles(data.access_token);
    }
  }

  if (!token || !rolesResponse || rolesResponse.status === 401) {
    return {
      error: NextResponse.json(
        { message: "Sesión expirada." },
        { status: 401 }
      ),
    };
  }

  if (!rolesResponse.ok) {
    return {
      error: withSession(
        NextResponse.json(
          { message: "No tienes permisos para crear administradores." },
          { status: rolesResponse.status === 403 ? 403 : 502 }
        ),
        refreshedToken
      ),
    };
  }

  const roles = (await rolesResponse.json()) as Role[];
  const adminRoleId = roles.find((role) => role.code === "ADMIN")?.id;

  if (adminRoleId === undefined) {
    return {
      error: withSession(
        NextResponse.json(
          { message: "No se encontró el rol de administrador." },
          { status: 502 }
        ),
        refreshedToken
      ),
    };
  }

  return { token, adminRoleId, refreshedToken };
}

function fetchRoles(token: string) {
  return fetch(`${API_URL}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

// Reads the `sub` claim (user ID) without verifying the signature: the token
// comes straight from the backend over a server-to-server call.
function getTokenSubject(token: unknown) {
  if (typeof token !== "string") return null;

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// Same cookie as the backend proxy when the access token was refreshed.
function withSession(response: NextResponse, refreshedToken: string | null) {
  if (refreshedToken) {
    response.cookies.set("cf_access_token", refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return response;
}
