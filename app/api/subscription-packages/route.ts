import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

export async function GET() {
  return proxyBackend("subscription-packages");
}

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{1,29}$/;

function limitOrNull(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!CODE_PATTERN.test(code))
    return Response.json(
      { error: "Code must start with a letter and contain only letters, numbers, - or _ (2–30 characters)." },
      { status: 400 },
    );

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName || displayName.length > 100)
    return Response.json({ error: "Enter a valid display name." }, { status: 400 });

  const defaultMaxFirms = limitOrNull(body.defaultMaxFirms);
  const defaultMaxStaffPerFirm = limitOrNull(body.defaultMaxStaffPerFirm);
  const defaultMaxStaffTotal = limitOrNull(body.defaultMaxStaffTotal);
  if (defaultMaxFirms === null || defaultMaxStaffPerFirm === null || defaultMaxStaffTotal === null)
    return Response.json({ error: "Limits must be whole numbers of 0 or more, or left blank for unlimited." }, { status: 400 });

  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  const monthlyPrice = Number(body.monthlyPrice);
  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0)
    return Response.json({ error: "Enter a valid monthly price." }, { status: 400 });

  return proxyBackend("subscription-packages", {
    method: "POST",
    body: {
      code,
      displayName,
      defaultMaxFirms: defaultMaxFirms ?? null,
      defaultMaxStaffPerFirm: defaultMaxStaffPerFirm ?? null,
      defaultMaxStaffTotal: defaultMaxStaffTotal ?? null,
      monthlyPrice,
      sortOrder,
    },
  });
}
