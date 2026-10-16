
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const hasSession =
    request.cookies.has("cf_access_token") ||
    request.cookies.has("cf_refresh_token");

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/posts/:path*",
    "/users/:path*",
    "/catalogs/:path*",
    "/administration/:path*",
    "/audit-logs/:path*",
    "/login",
  ],
};
