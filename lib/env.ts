export function getPublicBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not configured.")
  }

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
}
