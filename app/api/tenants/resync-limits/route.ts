import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

/** One-time (re-runnable) fix for every tenant whose plan-limit columns were never populated
 * — see TenantsAdminController.ResyncAllTenantLimits. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  return proxyBackend("tenants/resync-limits", { method: "POST" });
}
