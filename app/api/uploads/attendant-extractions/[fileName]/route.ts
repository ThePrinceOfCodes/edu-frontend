import { NextResponse } from "next/server"

import { getPublicOriginUrl } from "@/lib/env"

function isSafeFileName(fileName: string) {
  return Boolean(fileName) && !fileName.includes("/") && !fileName.includes("\\") && fileName !== "." && fileName !== ".."
}

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params
  const normalizedFileName = String(fileName || "").trim()

  if (!isSafeFileName(normalizedFileName)) {
    return NextResponse.json({ message: "Image not found" }, { status: 404 })
  }

  let backendUrl: URL

  try {
    backendUrl = new URL(
      `uploads/attendant-extractions/${encodeURIComponent(normalizedFileName)}`,
      getPublicOriginUrl()
    )
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "NEXT_PUBLIC_BASE_URL is not configured." },
      { status: 500 }
    )
  }

  const response = await fetch(backendUrl.toString(), { cache: "no-store" })

  if (!response.ok) {
    return NextResponse.json({ message: "Image not found" }, { status: response.status })
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": response.headers.get("cache-control") || "no-store",
    },
  })
}
