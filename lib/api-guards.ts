export const SESSION_COOKIE = "lca_session";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * True only when the request's Origin header parses and matches the Host header.
 * A missing, "null" or malformed Origin returns false instead of throwing.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function invalidOriginResponse() {
  return Response.json(
    { error: "Invalid origin" },
    { status: 403, headers: NO_STORE },
  );
}

/** Parses a positive 32-bit integer id ("1".."2147483647"), else null. */
export function parseId(value: string | null | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}

/**
 * Returns an error response unless the context belongs to an owner.
 * A null/undefined context (no session or unreadable claims) never passes.
 */
export function requireOwner(
  context: { isOwner: boolean } | null | undefined,
  message: string,
) {
  if (!context)
    return Response.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401, headers: NO_STORE },
    );
  if (!context.isOwner)
    return Response.json(
      { error: message },
      { status: 403, headers: NO_STORE },
    );
  return null;
}
