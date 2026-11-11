import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseId } from "@/lib/api-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "Invalid tenant id." }, { status: 400 });

  return proxyBackend(`tenants/${id}/mark-paid`, { method: "POST" });
}
