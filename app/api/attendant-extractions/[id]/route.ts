import { proxyRequest } from "@/app/api/_lib/proxy"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyRequest({ request, method: "GET", path: `v1/attendant-extractions/${id}` })
}
