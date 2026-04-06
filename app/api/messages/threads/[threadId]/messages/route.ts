import { proxyRequest } from "@/app/api/_lib/proxy"

type Params = { params: Promise<{ threadId: string }> }

export async function GET(request: Request, { params }: Params) {
  const { threadId } = await params
  return proxyRequest({ request, method: "GET", path: `v1/messages/threads/${threadId}/messages` })
}

export async function POST(request: Request, { params }: Params) {
  const { threadId } = await params
  return proxyRequest({ request, method: "POST", path: `v1/messages/threads/${threadId}/messages` })
}
