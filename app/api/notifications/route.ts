import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

export async function GET() {
  return proxyBackend("notifications?limit=300");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!subject || subject.length > 200)
    return Response.json({ error: "Enter a subject up to 200 characters." }, { status: 400 });

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000)
    return Response.json({ error: "Enter a message up to 4000 characters." }, { status: 400 });

  const allTenants = body.allTenants === true;
  const tenantIds = Array.isArray(body.tenantIds)
    ? body.tenantIds.filter((id: unknown) => Number.isInteger(id))
    : [];
  if (!allTenants && tenantIds.length === 0)
    return Response.json({ error: "Select at least one tenant, or choose to notify all tenants." }, { status: 400 });

  return proxyBackend("notifications", {
    method: "POST",
    body: { tenantIds, allTenants, subject, message },
  });
}
