import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ classId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { classId } = await context.params
  return proxyRequest({ request, method: "GET", path: `v1/classes/${classId}` })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { classId } = await context.params
  return proxyRequest({ request, method: "PATCH", path: `v1/classes/${classId}` })
}

export async function DELETE(request: Request, context: RouteContext) {
  const { classId } = await context.params
  return proxyRequest({ request, method: "DELETE", path: `v1/classes/${classId}` })
}
