export function getPublicBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not configured.")
  }

  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
}

export function getPublicOriginUrl() {
  const baseUrl = new URL(getPublicBaseUrl())
  return `${baseUrl.origin}/`
}

export function buildBackendUrl(path: string) {
  const baseUrl = getPublicBaseUrl()
  const base = new URL(baseUrl)
  let normalizedPath = path.replace(/^\/+/, "")
  const basePath = base.pathname.replace(/\/+$/, "")
  const baseEndsWithV1 = /\/v1$/i.test(basePath)

  if (baseEndsWithV1 && /^v1(?:\/|$)/i.test(normalizedPath)) {
    normalizedPath = normalizedPath.replace(/^v1\/?/i, "")
  }

  return new URL(normalizedPath, baseUrl)
}
