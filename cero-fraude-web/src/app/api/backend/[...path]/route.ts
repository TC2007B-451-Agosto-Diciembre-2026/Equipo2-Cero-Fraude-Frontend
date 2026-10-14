
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function handleRequest(request: NextRequest, context: Context) {
  const { path } = await context.params;

  // Evita solicitudes de otros orígenes sobre rutas que modifican datos.
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { message: "Origen no permitido." },
        { status: 403 }
      );
    }
  }

  const endpoint = path.map(encodeURIComponent).join("/");
  const url = `${API_URL}/${endpoint}${request.nextUrl.search}`;
  const accessToken = request.cookies.get("cf_access_token")?.value;
  const refreshToken = request.cookies.get("cf_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { message: "Sesión no iniciada." },
      { status: 401 }
    );
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  async function sendRequest(token: string) {
    return fetch(url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(headers),
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
  }

  let backendResponse = accessToken
    ? await sendRequest(accessToken)
    : null;

  let newAccessToken: string | null = null;

  // Intenta renovar el token si expiró.
  if ((!backendResponse || backendResponse.status === 401) && refreshToken) {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });


    if (refreshResponse.ok) {
  const data = await refreshResponse.json();

  const token: string = data.access_token;

  newAccessToken = token;
  backendResponse = await sendRequest(token);
}
  }

  if (!backendResponse) {
    return NextResponse.json(
      { message: "Sesión expirada." },
      { status: 401 }
    );
  }

  const response = new NextResponse(
    backendResponse.status === 204
      ? null
      : await backendResponse.arrayBuffer(),
    {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ??
          "application/json",
        "Cache-Control": "no-store",
      },
    }
  );

  if (newAccessToken) {
    response.cookies.set("cf_access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  if (backendResponse.status === 401) {
    response.cookies.delete("cf_access_token");
    response.cookies.delete("cf_refresh_token");
  }

  return response;
}

export async function GET(request: NextRequest, context: Context) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return handleRequest(request, context);
}
