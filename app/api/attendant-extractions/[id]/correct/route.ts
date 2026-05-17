import { proxyRequest } from "@/app/api/_lib/proxy"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyRequest({ request, method: "PATCH", path: `v1/attendant-extractions/${id}/correct` })
}
