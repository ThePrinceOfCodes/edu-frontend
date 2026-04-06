type ApiError = {
  message?: string
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
}

function redirectToSignIn() {
  if (typeof window === "undefined") {
    return
  }

  const nextPath = `${window.location.pathname}${window.location.search}`
  const signInUrl = new URL("/auth/sign-in", window.location.origin)

  if (nextPath && nextPath !== "/") {
    signInUrl.searchParams.set("next", nextPath)
  }

  window.location.replace(signInUrl.toString())
}

export async function request<T>(url: string, options: RequestOptions = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = (await response.json().catch(() => ({}))) as T & ApiError

  if (!response.ok) {
    if (response.status === 401) {
      redirectToSignIn()
      throw new Error("Unauthorized")
    }

    throw new Error(payload.message ?? "Request failed")
  }

  return payload
}