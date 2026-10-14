
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    message: "Sesión cerrada.",
  });

  response.cookies.delete("cf_access_token");
  response.cookies.delete("cf_refresh_token");

  return response;
}
