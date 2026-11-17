import { proxyBackend } from "@/lib/backend";

export async function GET() {
  return proxyBackend("audit-logs?limit=200");
}
