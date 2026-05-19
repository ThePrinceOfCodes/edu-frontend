import { NextResponse } from "next/server"

import { buildBackendUrl } from "@/lib/env"

export async function POST(request: Request) {
  const formData = await request.formData()
  const backendUrl = buildBackendUrl("v1/attendant-extractions/test/pi").toString()

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
