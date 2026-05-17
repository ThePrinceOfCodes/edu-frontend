import { proxyRequest } from "@/app/api/_lib/proxy"

export async function POST(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const age = searchParams.get("age")
  return proxyRequest({
    request,
    method: "POST",
    path: `v1/attendant-extractions/queue/clean${age ? `?age=${age}` : ""}`,
  })
}