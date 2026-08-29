import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { isAuthConfigured } from "@/lib/auth/config";

export async function proxy(request: NextRequest) {
  if (!isAuthConfigured() || request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // This is only an optimistic redirect. Protected pages and mutations must
  // validate the database-backed session with auth.api.getSession().
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
