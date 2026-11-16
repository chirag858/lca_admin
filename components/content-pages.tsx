"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { EmptyState } from "./ui/empty-state";
import { Skeleton } from "./ui/skeleton";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";

type SitePage = { slug: string; title: string; content: string; updatedAt: string };

type Faq = { question: string; answer: string };

export const CONTENT_PAGE_SLUGS = ["terms-and-conditions", "privacy-policy", "about-us", "contact-us", "faqs"] as const;
export type ContentPageSlug = (typeof CONTENT_PAGE_SLUGS)[number];

function parseFaqs(content: string): Faq[] {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Faq => !!item && typeof item.question === "string" && typeof item.answer === "string")
      .map((item) => ({ question: item.question, answer: item.answer }));
  } catch {
    return [];
  }
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ContentPages({ slug }: { slug: ContentPageSlug }) {
  const router = useRouter();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { toast, show: notify, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<SitePage[]>(
          "/api/content-pages",
          { signal: controller.signal },
          "Unable to load content pages.",
        );
        if (!controller.signal.aborted) setPages(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load content pages.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const active = pages.find((p) => p.slug === slug);

  return (
    <>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-label">Platform Admin</span>
          </div>
          <div className="topbar-right">
            <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
              <RefreshCcw size={16} /> Refresh
            </button>
            <button type="button" className="button" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>
        <main className="content">
          <PageHeader
            trail="Content Pages"
            title={active?.title ?? "Content Page"}
            description="Edit the content shown on the public site."
          />

          {loading ? (
            <section className="card content-editor">
              <div className="catalogue-heading">
                <div style={{ display: "grid", gap: 8 }}>
                  <Skeleton width={160} height={15} />
                  <Skeleton width={140} height={11} />
                </div>
              </div>
              <div className="content-editor-body">
                <div style={{ display: "grid", gap: 8 }}>
                  <Skeleton width={90} height={11} />
                  <Skeleton width="100%" height={38} radius={8} />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <Skeleton width={90} height={11} />
                  <Skeleton width="100%" height={160} radius={8} />
                </div>
              </div>
            </section>
          ) : error ? (
            <p className="form-alert" role="alert">
              {error}
            </p>
          ) : active ? (
            <PageEditor
              key={active.slug}
              page={active}
              onSaved={(updated) => {
                setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
                notify(`"${updated.title}" was saved.`);
              }}
            />
          ) : (
            <EmptyState icon={<RefreshCcw size={28} />} title="Page not found" text="This content page hasn't been created on the backend yet." />
          )}
        </main>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}

function PageEditor({ page, onSaved }: { page: SitePage; onSaved: (page: SitePage) => void }) {
  const isFaqs = page.slug === "faqs";
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [faqs, setFaqs] = useState<Faq[]>(() => (isFaqs ? parseFaqs(page.content) : []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = isFaqs ? JSON.stringify(faqs) : content;
      const updated = await fetchJson<{ slug: string; title: string; content: string; updatedAt: string }>(
        `/api/content-pages/${encodeURIComponent(page.slug)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), content: body }),
        },
        "Unable to save this page.",
      );
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this page.");
    } finally {
      setSaving(false);
    }
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  }

  function updateFaq(index: number, field: keyof Faq, value: string) {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  }

  function removeFaq(index: number) {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <section className="card content-editor">
      <div className="catalogue-heading">
        <div>
          <h3>{page.title}</h3>
          <p>Last updated {fmtDate(page.updatedAt)}</p>
        </div>
      </div>

      <div className="content-editor-body">
        <label>
          <span>Page title</span>
          <input maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        {isFaqs ? (
          <div className="faq-editor">
            {faqs.length === 0 && <p className="text-muted">No questions yet. Add the first one below.</p>}
            {faqs.map((faq, i) => (
              <div className="faq-row" key={i}>
                <div className="faq-row-fields">
                  <label>
                    <span>Question</span>
                    <input value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)} />
                  </label>
                  <label>
                    <span>Answer</span>
                    <textarea rows={3} value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)} />
                  </label>
                </div>
                <button type="button" title="Remove question" aria-label={`Remove question ${i + 1}`} onClick={() => removeFaq(i)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button type="button" className="button" onClick={addFaq}>
              <Plus size={16} /> Add question
            </button>
          </div>
        ) : (
          <label>
            <span>Content</span>
            <textarea rows={18} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the page content…" />
          </label>
        )}

        {!!error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}

        <div className="content-editor-actions">
          <button type="button" className="primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
