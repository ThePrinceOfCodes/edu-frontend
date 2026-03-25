import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ termId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { termId } = await context.params
  return proxyRequest({ request, method: "GET", path: `v1/terms/${termId}` })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { termId } = await context.params
  return proxyRequest({ request, method: "PATCH", path: `v1/terms/${termId}` })
}

export async function DELETE(request: Request, context: RouteContext) {
  const { termId } = await context.params
  return proxyRequest({ request, method: "DELETE", path: `v1/terms/${termId}` })
}
