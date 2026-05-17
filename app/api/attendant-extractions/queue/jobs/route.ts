import { proxyRequest } from "@/app/api/_lib/proxy"

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const type = searchParams.get("type") || "waiting"
  const start = searchParams.get("start") || "0"
  const end = searchParams.get("end") || "20"
  return proxyRequest({
    request,
    method: "GET",
    path: `v1/attendant-extractions/queue/jobs?type=${type}&start=${start}&end=${end}`,
  })
}