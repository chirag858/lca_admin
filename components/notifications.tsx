"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw, Send, Bell, Check, X, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { SkeletonRows } from "./ui/skeleton";
import { SearchInput } from "./ui/search-input";
import { TenantCell } from "./ui/tenant-cell";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";

type TenantOption = { tenantId: number; tenantName: string };

type NotificationEntry = {
  id: number;
  batchId: string;
  tenantId: number;
  tenantName: string;
  subject: string;
  message: string;
  status: "Sent" | "Failed";
  errorMessage: string | null;
  createdAt: string;
};

function fmtDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function Notifications() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [entries, setEntries] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [listSearch, setListSearch] = useState("");
  const { toast, show: notify, dismiss: dismissToast } = useToast();

  const [allTenants, setAllTenants] = useState(true);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [pickerSearch, setPickerSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [tenantsData, entriesData] = await Promise.all([
          fetchJson<TenantOption[]>("/api/tenants", { signal: controller.signal }, "Unable to load tenants."),
          fetchJson<NotificationEntry[]>("/api/notifications", { signal: controller.signal }, "Unable to load notifications."),
        ]);
        if (!controller.signal.aborted) {
          setTenants(tenantsData);
          setEntries(entriesData);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load notifications.");
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

  function togglePicked(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pickerFiltered = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter((t) => t.tenantName.toLowerCase().includes(q));
  }, [tenants, pickerSearch]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    if (!subject.trim() || !message.trim()) {
      setFormError("Enter a subject and a message.");
      return;
    }
    if (!allTenants && picked.size === 0) {
      setFormError("Select at least one tenant, or choose \"All tenants\".");
      return;
    }
    setSending(true);
    try {
      const result = await fetchJson<{ sentCount: number; failedCount: number }>(
        "/api/notifications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allTenants,
            tenantIds: allTenants ? [] : Array.from(picked),
            subject: subject.trim(),
            message: message.trim(),
          }),
        },
        "Unable to send notification.",
      );
      notify(
        result.failedCount > 0
          ? `Sent to ${result.sentCount} tenant${result.sentCount === 1 ? "" : "s"}, ${result.failedCount} failed.`
          : `Sent to ${result.sentCount} tenant${result.sentCount === 1 ? "" : "s"}.`,
      );
      setSubject("");
      setMessage("");
      setPicked(new Set());
      setRetry((n) => n + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to send notification.");
    } finally {
      setSending(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.tenantName.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q),
    );
  }, [entries, listSearch]);

  const sentCount = useMemo(() => entries.filter((e) => e.status === "Sent").length, [entries]);
  const failedCount = useMemo(() => entries.filter((e) => e.status === "Failed").length, [entries]);
  const pickedTenants = useMemo(() => tenants.filter((t) => picked.has(t.tenantId)), [tenants, picked]);

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
            trail="Admin"
            title="Notifications"
            pill="Comms"
            description="Email tenants directly, then see whether each one's copy actually went out."
          />

          <section className="stats">
            <article className="card stat">
              <div>
                <span>Total sent</span>
                <h2>{String(entries.length).padStart(2, "0")}</h2>
                <small>Every recipient, every send</small>
              </div>
              <span className="icon-tile violet"><Mail size={23} /></span>
            </article>
            <article className="card stat">
              <div>
                <span>Delivered</span>
                <h2>{String(sentCount).padStart(2, "0")}</h2>
                <small>Confirmed delivery</small>
              </div>
              <span className="icon-tile green"><CheckCircle2 size={23} /></span>
            </article>
            <article className="card stat">
              <div>
                <span>Failed</span>
                <h2>{String(failedCount).padStart(2, "0")}</h2>
                <small>Could not be delivered</small>
              </div>
              <span className="icon-tile orange"><AlertCircle size={23} /></span>
            </article>
          </section>

          <section className="card catalogue">
            <CardHeading title="" text="" />
            <form onSubmit={send} style={{ padding: "0 24px 24px", display: "grid", gap: 18 }}>
              <div className="audience-picker">
                <div className="segmented" role="tablist" aria-label="Audience">
                  <button type="button" role="tab" aria-selected={allTenants} className={`segmented-option${allTenants ? " active" : ""}`} onClick={() => setAllTenants(true)}>
                    All tenants ({tenants.length})
                  </button>
                  <button type="button" role="tab" aria-selected={!allTenants} className={`segmented-option${!allTenants ? " active" : ""}`} onClick={() => setAllTenants(false)}>
                    Select tenants
                  </button>
                </div>

                {!allTenants && (
                  <div style={{ display: "grid", gap: 10 }}>
                    {pickedTenants.length > 0 && (
                      <div className="selected-chip-row">
                        {pickedTenants.map((t) => (
                          <span className="selected-chip" key={t.tenantId}>
                            {t.tenantName}
                            <button type="button" aria-label={`Remove ${t.tenantName}`} onClick={() => togglePicked(t.tenantId)}>
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <SearchInput
                      value={pickerSearch}
                      onChange={setPickerSearch}
                      label="Search tenants to notify"
                      placeholder="Search tenants…"
                    />
                    <div className="tenant-picker-list">
                      {pickerFiltered.length === 0 && (
                        <p className="text-muted" style={{ padding: 10 }}>
                          No tenants match your search.
                        </p>
                      )}
                      {pickerFiltered.map((t) => {
                        const isPicked = picked.has(t.tenantId);
                        return (
                          <button
                            type="button"
                            key={t.tenantId}
                            className={`tenant-picker-item${isPicked ? " selected" : ""}`}
                            onClick={() => togglePicked(t.tenantId)}
                          >
                            <span className="tenant-picker-check">{isPicked && <Check size={12} />}</span>
                            {t.tenantName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <label className="notify-form-field">
                <span>Subject</span>
                <input
                  maxLength={200}
                  placeholder="e.g. Scheduled maintenance this weekend"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="notify-form-field">
                <div className="field-top">
                  <span>Message</span>
                  <span className="char-count">{message.length} / 4000</span>
                </div>
                <textarea
                  maxLength={4000}
                  placeholder="Write what you want tenants to know…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>

              {!!formError && (
                <p className="form-alert" role="alert">
                  {formError}
                </p>
              )}

              <div>
                <button type="submit" className="primary" disabled={sending}>
                  <Send size={16} /> {sending ? "Sending…" : "Send notification"}
                </button>
              </div>
            </form>
          </section>

          <section className="card catalogue">
            <CardHeading
              title="Sent notifications"
              count={`${filteredEntries.length} of ${entries.length}`}
              text="One row per tenant per send — shows whether that tenant's copy actually delivered."
            />
            <div className="filters">
              <SearchInput
                value={listSearch}
                onChange={setListSearch}
                label="Search sent notifications"
                placeholder="Search by tenant or subject…"
              />
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TENANT</th>
                    <th>SUBJECT</th>
                    <th>STATUS</th>
                    <th>SENT AT</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <SkeletonRows cols={4} widths={["60%", "70%", "40%", "40%"]} />}
                  {!loading &&
                    filteredEntries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <TenantCell tenantId={e.tenantId} tenantName={e.tenantName} />
                        </td>
                        <td>
                          {e.subject}
                          {e.errorMessage && <span className="table-subtext">{e.errorMessage}</span>}
                        </td>
                        <td>
                          <span className={`usage-pill usage-${e.status === "Sent" ? "green" : "red"}`}>{e.status}</span>
                        </td>
                        <td>{fmtDate(e.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!loading && !filteredEntries.length && (
                <EmptyState
                  icon={<Bell size={28} />}
                  title={error ? "Unable to load notifications" : entries.length ? "No entries match your search" : "No notifications sent yet"}
                  text={
                    <span role={error ? "alert" : "status"}>
                      {error || (entries.length ? "Try a different search." : "Send your first notification above.")}
                    </span>
                  }
                  action={
                    error ? (
                      <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
                        Retry
                      </button>
                    ) : undefined
                  }
                />
              )}
            </div>
          </section>
        </main>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
