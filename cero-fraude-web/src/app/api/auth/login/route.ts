
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const credentials = await request.json();

    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.password,
      }),
      cache: "no-store",
    });

    if (!loginResponse.ok) {
      return NextResponse.json(
        { message: "Credenciales incorrectas." },
        { status: loginResponse.status }
      );
    }

    const tokens = await loginResponse.json();

    const userResponse = await fetch(`${API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
      cache: "no-store",
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { message: "No fue posible verificar tu cuenta." },
        { status: 401 }
      );
    }

    const user = await userResponse.json();
    console.log("LOGIN USER:", {
  role_id: user.role_id,
  is_active: user.is_active,
  username: user.username,
});

    // Según la documentación, role_id 2 es ADMIN.
    if (user.role_id !== 2 || !user.is_active) {
      return NextResponse.json(
        { message: "No tienes acceso al panel administrativo." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
    };

    response.cookies.set("cf_access_token", tokens.access_token, {
      ...cookieOptions,
      maxAge: 15 * 60,
    });

    response.cookies.set("cf_refresh_token", tokens.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "No fue posible conectar con el servidor." },
      { status: 500 }
    );
  }
}
