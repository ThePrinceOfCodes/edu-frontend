import { proxyRequest } from "@/app/api/_lib/proxy"

export async function POST(request: Request) {
  return proxyRequest({ request, method: "POST", path: "v1/schools/bulk-import" })
}
