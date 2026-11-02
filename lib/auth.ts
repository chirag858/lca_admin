import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "lca_admin_session";
const MIN_SECRET_LENGTH = 32;

function sessionSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!configured || configured.length < MIN_SECRET_LENGTH)
      throw new Error(
        `ADMIN_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production.`,
      );
    return configured;
  }
  const store = globalThis as typeof globalThis & { lcaAdminSecret?: string };
  store.lcaAdminSecret =
    configured || store.lcaAdminSecret || randomBytes(32).toString("hex");
  return store.lcaAdminSecret;
}

type AdminSession = { accessToken: string; expires: number };

/** Wraps the backend-issued admin JWT (api/admin/login) in a signed cookie. */
export function createSession(accessToken: string, expires: number) {
  const value = Buffer.from(JSON.stringify({ accessToken, expires })).toString(
    "base64url",
  );
  return `${value}.${createHmac("sha256", sessionSecret()).update(value).digest("hex")}`;
}

export async function getSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [value, sig, extra] = token.split(".");
  if (!sig || !/^[a-f0-9]{64}$/.test(sig) || extra) return null;
  const expected = createHmac("sha256", sessionSecret())
    .update(value)
    .digest("hex");
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    return null;
  try {
    const session = JSON.parse(Buffer.from(value, "base64url").toString());
    return typeof session.accessToken === "string" &&
      session.accessToken &&
      typeof session.expires === "number" &&
      session.expires > Date.now()
      ? session
      : null;
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return (await getSession()) !== null;
}
