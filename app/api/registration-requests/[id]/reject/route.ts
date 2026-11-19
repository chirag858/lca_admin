import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseGuid } from "@/lib/api-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseGuid((await params).id);
  if (!id) return Response.json({ error: "Invalid request id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 1000)
    return Response.json({ error: "Enter a rejection reason (up to 1000 characters)." }, { status: 400 });

  return proxyBackend(`registration-requests/${id}/reject`, { method: "POST", body: { reason } });
}
