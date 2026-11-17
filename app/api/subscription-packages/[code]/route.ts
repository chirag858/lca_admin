import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{1,29}$/;

function limitOrNull(value: unknown): number | null | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const RESOURCE_KEYS = ["customers", "quotations", "roles", "product_images_per_product"];

function parseResourceLimits(value: unknown): Record<string, number | null> | null {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, number | null> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!RESOURCE_KEYS.includes(key)) return null;
    if (raw === "" || raw === null || raw === undefined) {
      out[key] = null;
      continue;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) return null;
    out[key] = n;
  }
  return out;
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
  const defaultMaxProducts = limitOrNull(body.defaultMaxProducts);
  const defaultMaxCategories = limitOrNull(body.defaultMaxCategories);
  const defaultMaxCategoryMappings = limitOrNull(body.defaultMaxCategoryMappings);
  const defaultMaxTransportFirms = limitOrNull(body.defaultMaxTransportFirms);
  const defaultMaxAttributes = limitOrNull(body.defaultMaxAttributes);
  if (
    defaultMaxFirms === null || defaultMaxStaffPerFirm === null || defaultMaxStaffTotal === null ||
    defaultMaxProducts === null || defaultMaxCategories === null || defaultMaxCategoryMappings === null ||
    defaultMaxTransportFirms === null || defaultMaxAttributes === null
  )
    return Response.json({ error: "Limits must be whole numbers of 0 or more, or left blank for unlimited." }, { status: 400 });

  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  const monthlyPrice = Number(body.monthlyPrice);
  if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0)
    return Response.json({ error: "Enter a valid monthly price." }, { status: 400 });

  const resourceLimits = parseResourceLimits(body.resourceLimits);
  if (resourceLimits === null)
    return Response.json({ error: "Resource limits must be whole numbers of 0 or more, or left blank for unlimited." }, { status: 400 });

  return proxyBackend(`subscription-packages/${encodeURIComponent(code)}`, {
    method: "PUT",
    body: {
      displayName,
      defaultMaxFirms: defaultMaxFirms ?? null,
      defaultMaxStaffPerFirm: defaultMaxStaffPerFirm ?? null,
      defaultMaxStaffTotal: defaultMaxStaffTotal ?? null,
      defaultMaxProducts: defaultMaxProducts ?? null,
      defaultMaxCategories: defaultMaxCategories ?? null,
      defaultMaxCategoryMappings: defaultMaxCategoryMappings ?? null,
      defaultMaxTransportFirms: defaultMaxTransportFirms ?? null,
      defaultMaxAttributes: defaultMaxAttributes ?? null,
      monthlyPrice,
      sortOrder,
      isActive: body.isActive === true,
      resourceLimits,
    },
  });
}
