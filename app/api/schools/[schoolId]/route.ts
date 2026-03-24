import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ schoolId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { schoolId } = await context.params
  return proxyRequest({ request, method: "GET", path: `v1/schools/${schoolId}` })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { schoolId } = await context.params
  return proxyRequest({ request, method: "PATCH", path: `v1/schools/${schoolId}` })
}

export async function DELETE(request: Request, context: RouteContext) {
  const { schoolId } = await context.params
  return proxyRequest({ request, method: "DELETE", path: `v1/schools/${schoolId}` })
}