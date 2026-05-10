import { proxyRequest } from "@/app/api/_lib/proxy"

export async function GET(request: Request) {
  return proxyRequest({ request, method: "GET", path: "v1/guardians" })
}

export async function POST(request: Request) {
  return proxyRequest({ request, method: "POST", path: "v1/guardians" })
}
