import type { LoginInput, LoginResult } from "@/interfaces/auth-interface"
import { request } from "@/services/http"

export const authService = {
  login(input: LoginInput) {
    return request<LoginResult>("/api/auth/login", {
      method: "POST",
      body: input,
    })
  },
}
