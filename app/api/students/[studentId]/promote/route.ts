import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ studentId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { studentId } = await context.params
  return proxyRequest({ request, method: "POST", path: `v1/students/${studentId}/promote` })
}
