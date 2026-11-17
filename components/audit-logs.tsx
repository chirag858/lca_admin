"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw, ScrollText } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { SkeletonRows } from "./ui/skeleton";
import { SearchInput } from "./ui/search-input";
import { TenantCell } from "./ui/tenant-cell";

type AuditLogEntry = {
  id: number;
  tenantId: number;
  tenantName: string;
  action: string;
  details: string | null;
  createdAt: string;
};

function fmtDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function actionLabel(action: string) {
  return action
    .replace(/^tenant\./, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AuditLogs() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<AuditLogEntry[]>(
          "/api/audit-logs",
          { signal: controller.signal },
          "Unable to load audit logs.",
        );
        if (!controller.signal.aborted) setEntries(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load audit logs.");
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.tenantName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.details ?? "").toLowerCase().includes(q),
    );
  }, [entries, search]);

  return (
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
          title="Audit Logs"
          description="Every administrative action across every tenant — who paid, who was onboarded, who was removed."
        />

        <section className="card catalogue">
          <CardHeading
            title="Activity"
            count={`${filtered.length} of ${entries.length} entries`}
            text="Newest first, across the whole platform."
          />
          <div className="filters">
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search audit logs"
              placeholder="Search by tenant, action or detail…"
            />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TENANT</th>
                  <th>ACTION</th>
                  <th>DETAILS</th>
                  <th>WHEN</th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={4} widths={["60%", "40%", "70%", "40%"]} />}
                {!loading &&
                  filtered.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <TenantCell tenantId={e.tenantId} tenantName={e.tenantName} />
                      </td>
                      <td>
                        <span className="pill">{actionLabel(e.action)}</span>
                      </td>
                      <td className="table-subtext" style={{ display: "table-cell", whiteSpace: "normal" }}>
                        {e.details ?? "—"}
                      </td>
                      <td>{fmtDate(e.createdAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!loading && !filtered.length && (
              <EmptyState
                icon={<ScrollText size={28} />}
                title={error ? "Unable to load audit logs" : entries.length ? "No entries match your search" : "No activity yet"}
                text={
                  <span role={error ? "alert" : "status"}>
                    {error || (entries.length ? "Try a different search." : "Admin actions will show up here as they happen.")}
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
  );
}
