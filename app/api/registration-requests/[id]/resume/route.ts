import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseGuid } from "@/lib/api-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseGuid((await params).id);
  if (!id) return Response.json({ error: "Invalid request id." }, { status: 400 });

  return proxyBackend(`registration-requests/${id}/resume`, { method: "POST" });
}
