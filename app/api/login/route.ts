import { NextResponse } from "next/server";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";
import { SESSION_COOKIE, createSession } from "@/lib/auth";
import { backendUrl } from "@/lib/backend";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const body = await request.json().catch(() => null);
  if (
    typeof body?.usernameOrEmail !== "string" ||
    typeof body?.password !== "string" ||
    !body.usernameOrEmail ||
    !body.password
  )
    return NextResponse.json(
      { error: "Enter your username/email and password." },
      { status: 400 },
    );
  if (body.usernameOrEmail.length > 256 || body.password.length > 1024)
    return NextResponse.json(
      { error: "Username/email or password is too long." },
      { status: 400 },
    );

  try {
    const upstream = await fetch(backendUrl("admin/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernameOrEmail: body.usernameOrEmail,
        password: body.password,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(300000),
    });
    if (!upstream.ok)
      return NextResponse.json(
        {
          error:
            upstream.status === 401
              ? "Incorrect username/email or password."
              : upstream.status === 429
                ? "Too many sign-in attempts. Please try again later."
                : "Sign-in is unavailable. Please try again.",
        },
        { status: upstream.status },
      );
    const data = await upstream.json();
    const expires = Date.parse(data.expiresAtUtc);
    if (
      typeof data.accessToken !== "string" ||
      !data.accessToken ||
      !Number.isFinite(expires) ||
      expires <= Date.now()
    )
      throw new Error("Invalid login response");

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, createSession(data.accessToken, expires), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(expires),
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the sign-in service. Please try again." },
      { status: 502 },
    );
  }
}
