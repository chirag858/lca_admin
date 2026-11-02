import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseId } from "@/lib/api-guards";

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,100}$/;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "Invalid tenant id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
  if (!tenantName || tenantName.length > 200)
    return Response.json({ error: "Enter a valid tenant name." }, { status: 400 });

  const ownerUsername = typeof body.ownerUsername === "string" ? body.ownerUsername.trim() : "";
  if (!USERNAME_PATTERN.test(ownerUsername))
    return Response.json(
      { error: "Owner username must be 3–100 characters (letters, numbers, . _ -)." },
      { status: 400 },
    );

  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
  if (!ownerEmail || ownerEmail.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    return Response.json({ error: "Enter a valid owner email." }, { status: 400 });

  const newOwnerPassword = typeof body.newOwnerPassword === "string" ? body.newOwnerPassword : "";
  if (newOwnerPassword && newOwnerPassword.length > 1024)
    return Response.json({ error: "Password must be 1024 characters or fewer." }, { status: 400 });

  return proxyBackend(`tenants/${id}`, {
    method: "PUT",
    body: {
      tenantName,
      ownerUsername,
      ownerEmail,
      ownerFirstName: typeof body.ownerFirstName === "string" ? body.ownerFirstName.trim() || null : null,
      ownerLastName: typeof body.ownerLastName === "string" ? body.ownerLastName.trim() || null : null,
      newOwnerPassword: newOwnerPassword || null,
      isActive: body.isActive !== false,
    },
  });
}
