import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await context.params
  return proxyRequest({ request, method: "POST", path: `v1/users/${userId}/deactivate` })
}
