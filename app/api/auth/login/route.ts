import { NextResponse } from "next/server"

import { getPublicBaseUrl } from "@/lib/env"
import { AUTH_TOKEN_COOKIE } from "@/lib/auth"

type LoginResponse = {
  token?: string
  accessToken?: string
  account?: {
    id?: string
    _id?: string
    name?: string
    email?: string
    avatar?: string | null
  }
  data?: {
    token?: string
    accessToken?: string
  }
}

function getLoginEndpoint() {
  return new URL("auth/login", getPublicBaseUrl()).toString()
}

function extractToken(payload: LoginResponse) {
  return payload.token ?? payload.accessToken ?? payload.data?.token ?? payload.data?.accessToken
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid login payload." }, { status: 400 })
  }

  let loginEndpoint: string

  try {
    loginEndpoint = getLoginEndpoint()
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "NEXT_PUBLIC_BASE_URL is not configured.",
      },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(loginEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const responseText = await response.text()
    const payload = responseText ? (safeJsonParse(responseText) as LoginResponse) : {}

    if (!response.ok) {
      const message =
        (payload as { message?: string }).message ?? "Unable to sign in. Please try again."

      return NextResponse.json({ message }, { status: response.status })
    }

    const token = extractToken(payload)

    if (!token) {
      return NextResponse.json(
        { message: "Login succeeded but no token was returned." },
        { status: 502 }
      )
    }

    const nextResponse = NextResponse.json({ ok: true, user: payload.account ?? null })

    nextResponse.cookies.set(AUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return nextResponse
  } catch {
    return NextResponse.json(
      { message: "We could not reach the login service." },
      { status: 502 }
    )
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}
