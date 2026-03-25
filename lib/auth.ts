export const AUTH_TOKEN_COOKIE = "auth_token"

export const PUBLIC_ROUTES = [
  "/",
  "/auth/sign-in",
  "/auth/request-access",
  "/auth/sign-up",
  "/auth/forgot-password",
]

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
