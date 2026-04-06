import { NextRequest, NextResponse } from "next/server"

import { AUTH_TOKEN_COOKIE, isPublicRoute } from "@/lib/auth"

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value

  if (!authToken && !isPublicRoute(pathname)) {
    const signInUrl = new URL("/auth/sign-in", request.url)

    if (pathname !== "/") {
      signInUrl.searchParams.set("next", `${pathname}${search}`)
    }

    return NextResponse.redirect(signInUrl)
  }

  if (authToken && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
}
