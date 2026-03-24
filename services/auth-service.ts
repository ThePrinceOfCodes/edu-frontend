import type { AuthUser, LoginInput, LoginResult } from "@/interfaces/auth-interface"
import { request } from "@/services/http"

const AUTH_USER_STORAGE_KEY = "auth_user"

function saveAuthUser(user: AuthUser | null | undefined) {
  if (typeof window === "undefined") {
    return
  }

  if (!user) {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    return
  }

  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user))
}

function readAuthUser() {
  if (typeof window === "undefined") {
    return null
  }

  const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export const authService = {
  async login(input: LoginInput) {
    const result = await request<LoginResult>("/api/auth/login", {
      method: "POST",
      body: input,
    })

    if (result.ok) {
      saveAuthUser(result.user ?? null)
    }

    return result
  },
  getStoredUser() {
    return readAuthUser()
  },
  clearStoredUser() {
    saveAuthUser(null)
  },
  async logout() {
    try {
      await request<{ ok: boolean }>("/api/auth/logout", {
        method: "POST",
      })
    } finally {
      saveAuthUser(null)
    }
  },
}
