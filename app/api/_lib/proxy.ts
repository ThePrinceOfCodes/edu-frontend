import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { AUTH_TOKEN_COOKIE } from "@/lib/auth"
import { getPublicBaseUrl } from "@/lib/env"

type ProxyMethod = "GET" | "POST" | "PATCH" | "DELETE"

function buildUrl(path: string, request?: Request) {
  const url = new URL(path, getPublicBaseUrl())

  if (request) {
    const incomingUrl = new URL(request.url)
    incomingUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }

  return url.toString()
}

async function getToken() {
  const cookieStore = await cookies()
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value
}

async function readBody(request: Request) {
  try {
    return await request.text()
  } catch {
    return ""
  }
}

export async function proxyRequest({
  request,
  method,
  path,
}: {
  request?: Request
  method: ProxyMethod
  path: string
}) {
  let backendUrl: string

  try {
    backendUrl = buildUrl(path, request)
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "NEXT_PUBLIC_BASE_URL is not configured.",
      },
      { status: 500 }
    )
  }

  const token = await getToken()

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const body = request ? await readBody(request) : ""

  try {
    const response = await fetch(backendUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body || undefined,
      cache: "no-store",
    })

    const responseText = await response.text()
    const payload = responseText ? safeJsonParse(responseText) : null

    if (!response.ok) {
      const message =
        (payload as { message?: string } | null)?.message ??
        "Unable to process your request."

      return NextResponse.json({ message }, { status: response.status })
    }

    if (response.status === 204 || !responseText) {
      return new NextResponse(null, { status: response.status })
    }

    return NextResponse.json(payload, { status: response.status })
  } catch {
    return NextResponse.json(
      { message: "We could not reach the backend service." },
      { status: 502 }
    )
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}