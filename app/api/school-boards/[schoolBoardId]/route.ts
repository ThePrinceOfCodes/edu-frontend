import { proxyRequest } from "@/app/api/_lib/proxy"

type RouteContext = {
  params: Promise<{ schoolBoardId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { schoolBoardId } = await context.params
  return proxyRequest({
    request,
    method: "GET",
    path: `v1/school-boards/${schoolBoardId}`,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const { schoolBoardId } = await context.params
  return proxyRequest({
    request,
    method: "PATCH",
    path: `v1/school-boards/${schoolBoardId}`,
  })
}

export async function DELETE(request: Request, context: RouteContext) {
  const { schoolBoardId } = await context.params
  return proxyRequest({
    request,
    method: "DELETE",
    path: `v1/school-boards/${schoolBoardId}`,
  })
}