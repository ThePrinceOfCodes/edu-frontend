import { proxyRequest } from "@/app/api/_lib/proxy"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyRequest({ request, method: "POST", path: `v1/attendant-extractions/${id}/approve` })
}
