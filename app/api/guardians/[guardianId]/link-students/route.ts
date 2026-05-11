import { proxyRequest } from "@/app/api/_lib/proxy"

type Params = {
  params: Promise<{ guardianId: string }>
}

export async function POST(request: Request, { params }: Params) {
  const { guardianId } = await params
  return proxyRequest({ request, method: "POST", path: `v1/guardians/${guardianId}/link-students` })
}
