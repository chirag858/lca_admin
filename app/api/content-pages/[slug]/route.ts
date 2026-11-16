import { proxyBackend } from "@/lib/backend";
import { invalidOriginResponse, isSameOrigin } from "@/lib/api-guards";

const KNOWN_SLUGS = new Set([
  "terms-and-conditions",
  "privacy-policy",
  "about-us",
  "contact-us",
  "faqs",
]);

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOrigin(request)) return invalidOriginResponse();
  const slug = (await params).slug;
  if (!KNOWN_SLUGS.has(slug))
    return Response.json({ error: "Unknown page." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200)
    return Response.json({ error: "Enter a valid title." }, { status: 400 });

  const content = typeof body.content === "string" ? body.content : "";

  return proxyBackend(`content-pages/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: { title, content },
  });
}
