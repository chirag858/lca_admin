import { proxyBackend } from "@/lib/backend";
import { parseGuid } from "@/lib/api-guards";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseGuid((await params).id);
  if (!id) return Response.json({ error: "Invalid request id." }, { status: 400 });
  return proxyBackend(`registration-requests/${id}`);
}
