import { proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status");
  return proxyBackend(`registration-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`);
}
