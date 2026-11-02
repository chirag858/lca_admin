import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

export async function GET() {
  return proxyBackend("tenants");
}

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,100}$/;
const PACKAGES = ["Basic", "Standard", "Premium", "Enterprise", "Custom"];

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const tenantName = typeof body.tenantName === "string" ? body.tenantName.trim() : "";
  if (!tenantName || tenantName.length > 200)
    return Response.json({ error: "Enter a valid tenant name." }, { status: 400 });

  const subscriptionPackage = typeof body.subscriptionPackage === "string" ? body.subscriptionPackage : "";
  if (!PACKAGES.includes(subscriptionPackage))
    return Response.json({ error: "Select a valid subscription package." }, { status: 400 });

  const ownerUsername = typeof body.ownerUsername === "string" ? body.ownerUsername.trim() : "";
  if (!USERNAME_PATTERN.test(ownerUsername))
    return Response.json(
      { error: "Owner username must be 3–100 characters (letters, numbers, . _ -)." },
      { status: 400 },
    );

  const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";
  if (!ownerEmail || ownerEmail.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    return Response.json({ error: "Enter a valid owner email." }, { status: 400 });

  const ownerPassword = typeof body.ownerPassword === "string" ? body.ownerPassword : "";
  if (!ownerPassword || ownerPassword.length > 1024)
    return Response.json({ error: "Enter an owner password." }, { status: 400 });

  function limitOrNull(value: unknown): number | null | undefined {
    if (value === "" || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }
  const maxFirms = limitOrNull(body.maxFirms);
  const maxStaffPerFirm = limitOrNull(body.maxStaffPerFirm);
  const maxStaffTotal = limitOrNull(body.maxStaffTotal);
  if (maxFirms === null || maxStaffPerFirm === null || maxStaffTotal === null)
    return Response.json({ error: "Limits must be whole numbers of 0 or more." }, { status: 400 });

  if (subscriptionPackage === "Custom" && (maxFirms === undefined || maxStaffPerFirm === undefined || maxStaffTotal === undefined))
    return Response.json(
      { error: "Custom plans require max firms, max staff per firm, and max staff total." },
      { status: 400 },
    );

  return proxyBackend("tenants", {
    method: "POST",
    body: {
      tenantName,
      subscriptionPackage,
      maxFirms,
      maxStaffPerFirm,
      maxStaffTotal,
      ownerUsername,
      ownerEmail,
      ownerPassword,
      ownerFirstName: typeof body.ownerFirstName === "string" ? body.ownerFirstName.trim() || null : null,
      ownerLastName: typeof body.ownerLastName === "string" ? body.ownerLastName.trim() || null : null,
    },
  });
}
