import { getSession } from "./auth";

export function backendUrl(path: string) {
  const base = process.env.BACKEND_API_URL;
  if (!base) throw new Error("BACKEND_API_URL is not configured.");
  return `${base.replace(/\/$/, "")}/api/${path}`;
}

/**
 * Proxies to the platform-admin backend endpoints (api/admin/...), attaching
 * the admin's own bearer token (issued by POST api/admin/login) server-side
 * only — the browser never sees it. Requires a valid session cookie
 * (lib/auth.ts); callers must check that separately on pages so they can
 * also redirect to /login, not just 401 on an API call.
 */
export async function proxyBackend(
  path: string,
  init?: { method?: string; body?: unknown },
) {
  const headers = { "Cache-Control": "no-store" };
  const session = await getSession();
  if (!session)
    return Response.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401, headers },
    );
  try {
    const response = await fetch(backendUrl(`admin/${path}`), {
      method: init?.method || "GET",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(300000),
    });
    if (!response.ok) {
      const upstream = await response.json().catch(() => null);
      const error =
        response.status === 401
          ? "Your session expired. Please sign in again."
          : response.status === 400 ||
              response.status === 404 ||
              response.status === 409
            ? upstream?.message || "The request could not be completed."
            : "Unable to load data from the backend.";
      return Response.json({ error }, { status: response.status, headers });
    }
    if (response.status === 204)
      return new Response(null, { status: 204, headers });
    return Response.json(await response.json(), { headers });
  } catch {
    return Response.json(
      { error: "Unable to reach the backend. Please try again." },
      { status: 502, headers },
    );
  }
}
