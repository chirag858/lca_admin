import { NextResponse } from "next/server";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
