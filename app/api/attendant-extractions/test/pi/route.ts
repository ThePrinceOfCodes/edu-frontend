import { NextResponse } from "next/server"

import { getPublicBaseUrl } from "@/lib/env"

export async function POST(request: Request) {
  const formData = await request.formData()
  const backendUrl = new URL("v1/attendant-extractions/test/pi", getPublicBaseUrl()).toString()

  const response = await fetch(backendUrl, {
    method: "POST",
    body: formData,
    cache: "no-store",
  })

  const payload = await response.text()
  return new NextResponse(payload, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
  })
}
