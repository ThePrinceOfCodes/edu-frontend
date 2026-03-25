import { NextResponse } from "next/server"

import { getPublicBaseUrl } from "@/lib/env"

function getIntentEndpoint() {
  return new URL("auth/client-intent", getPublicBaseUrl()).toString()
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid intent payload." }, { status: 400 })
  }

  let endpoint: string

  try {
    endpoint = getIntentEndpoint()
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
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const responseText = await response.text()
    const payload = responseText ? (safeJsonParse(responseText) as { message?: string }) : {}

    if (!response.ok) {
      return NextResponse.json(
        { message: payload.message ?? "Unable to submit intent right now." },
        { status: response.status }
      )
    }

    return NextResponse.json({ ok: true, message: payload.message ?? "Intent submitted." })
  } catch {
    return NextResponse.json(
      { message: "We could not reach the backend service." },
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