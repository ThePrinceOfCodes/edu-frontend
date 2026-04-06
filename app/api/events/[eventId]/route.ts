import { proxyRequest } from "@/app/api/_lib/proxy"

type Params = { params: Promise<{ eventId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { eventId } = await params
  return proxyRequest({ request, method: "GET", path: `v1/events/${eventId}` })
}

export async function PATCH(request: Request, { params }: Params) {
  const { eventId } = await params
  return proxyRequest({ request, method: "PATCH", path: `v1/events/${eventId}` })
}

export async function DELETE(request: Request, { params }: Params) {
  const { eventId } = await params
  return proxyRequest({ request, method: "DELETE", path: `v1/events/${eventId}` })
}
