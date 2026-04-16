import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Backend sets JWT in this HTTP-only cookie on login/signup.
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // Public-only pages: authenticated users should not access these.
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isPublicFile = pathname.includes(".") || pathname.startsWith("/_next");

  if (isPublicFile) return NextResponse.next();

  // Already logged in: keep user off login/signup.
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/reports", request.url));
  }

  // Not logged in: protect private routes.
  if (!token && !isAuthPage && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
