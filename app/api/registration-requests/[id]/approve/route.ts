import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseGuid } from "@/lib/api-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseGuid((await params).id);
  if (!id) return Response.json({ error: "Invalid request id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (notes.length > 2000) return Response.json({ error: "Notes are too long." }, { status: 400 });

  return proxyBackend(`registration-requests/${id}/approve`, {
    method: "POST",
    body: { notes: notes || null },
  });
}
