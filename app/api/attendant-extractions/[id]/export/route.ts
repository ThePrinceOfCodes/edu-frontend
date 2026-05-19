import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { AUTH_TOKEN_COOKIE } from "@/lib/auth"
import { buildBackendUrl } from "@/lib/env"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const url = buildBackendUrl(`v1/attendant-extractions/${id}/export`)
  const incomingUrl = new URL(request.url)
  incomingUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value))

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    return NextResponse.json({ message: message || "Unable to export extraction." }, { status: response.status })
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": response.headers.get("content-disposition") || `attachment; filename="extraction-${id}"`,
    },
  })
}
