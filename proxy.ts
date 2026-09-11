import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // This is only an optimistic redirect. Protected pages and mutations must
  // validate the database-backed session with auth.api.getSession().
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|login|forgot-password|reset-password|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
