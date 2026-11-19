import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseGuid } from "@/lib/api-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseGuid((await params).id);
  if (!id) return Response.json({ error: "Invalid request id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  if (!note || note.length > 2000)
    return Response.json({ error: "Enter a note (up to 2000 characters)." }, { status: 400 });

  return proxyBackend(`registration-requests/${id}/notes`, { method: "POST", body: { note } });
}
