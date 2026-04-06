// frontend/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // 1. Static/Internal bypass
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 2. If logged in and hitting login, go to root
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. If NOT logged in and hitting a protected route, go to login
  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};