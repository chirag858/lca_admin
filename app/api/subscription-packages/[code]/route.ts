import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{1,29}$/;

function limitOrNull(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const code = (await params).code;
  if (!CODE_PATTERN.test(code))
    return Response.json({ error: "Invalid package code." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName || displayName.length > 100)
    return Response.json({ error: "Enter a valid display name." }, { status: 400 });

  const defaultMaxFirms = limitOrNull(body.defaultMaxFirms);
  const defaultMaxStaffPerFirm = limitOrNull(body.defaultMaxStaffPerFirm);
  const defaultMaxStaffTotal = limitOrNull(body.defaultMaxStaffTotal);
  if (defaultMaxFirms === null || defaultMaxStaffPerFirm === null || defaultMaxStaffTotal === null)
    return Response.json({ error: "Limits must be whole numbers of 0 or more, or left blank for unlimited." }, { status: 400 });

  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

  return proxyBackend(`subscription-packages/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: {
      displayName,
      defaultMaxFirms: defaultMaxFirms ?? null,
      defaultMaxStaffPerFirm: defaultMaxStaffPerFirm ?? null,
      defaultMaxStaffTotal: defaultMaxStaffTotal ?? null,
      sortOrder,
      isActive: body.isActive === true,
    },
  });
}
