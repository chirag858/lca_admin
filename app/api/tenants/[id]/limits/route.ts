import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin, parseId } from "@/lib/api-guards";

const PACKAGES = ["Basic", "Standard", "Premium", "Enterprise", "Custom"];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const id = parseId((await params).id);
  if (!id) return Response.json({ error: "Invalid tenant id." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const subscriptionPackage = typeof body.subscriptionPackage === "string" ? body.subscriptionPackage : "";
  if (!PACKAGES.includes(subscriptionPackage))
    return Response.json({ error: "Select a valid subscription package." }, { status: 400 });

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

  return proxyBackend(`tenants/${id}/limits`, {
    method: "PUT",
    body: {
      subscriptionPackage,
      maxFirms,
      maxStaffPerFirm,
      maxStaffTotal,
      allowOverLimit: body.allowOverLimit === true,
    },
  });
}
