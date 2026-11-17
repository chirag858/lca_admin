"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw, Workflow, MailCheck, CreditCard, Building2, CheckCircle2 } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { SkeletonRows } from "./ui/skeleton";
import { SearchInput } from "./ui/search-input";
import { Select, type SelectOption } from "./select";
import Link from "next/link";

type OnboardingEntry = {
  stage: "registered" | "payment_pending" | "setup_pending" | "onboarded";
  stageLabel: string;
  tenantId: number | null;
  registrationId: string | null;
  tenantName: string;
  contactName: string;
  email: string;
  paymentStatus: string | null;
  firmCount: number;
  branchCount: number;
  isExpired: boolean;
  createdAt: string;
};

const STAGE_META: Record<OnboardingEntry["stage"], { label: string; icon: typeof MailCheck; pill: string }> = {
  registered: { label: "Registered", icon: MailCheck, pill: "usage-pill usage-red" },
  payment_pending: { label: "Payment pending", icon: CreditCard, pill: "usage-pill usage-amber" },
  setup_pending: { label: "Setting up", icon: Building2, pill: "usage-pill usage-amber" },
  onboarded: { label: "Onboarded", icon: CheckCircle2, pill: "usage-pill usage-green" },
};

const STAGE_OPTIONS: SelectOption[] = [
  { value: "", label: "All stages" },
  { value: "registered", label: "Registered — unverified" },
  { value: "payment_pending", label: "Payment pending" },
  { value: "setup_pending", label: "Setting up" },
  { value: "onboarded", label: "Onboarded" },
];

function fmtDate(value: string) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

export default function Onboarding() {
  const router = useRouter();
  const [entries, setEntries] = useState<OnboardingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<OnboardingEntry[]>(
          "/api/onboarding",
          { signal: controller.signal },
          "Unable to load onboarding status.",
        );
        if (!controller.signal.aborted) setEntries(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load onboarding status.");
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

  const counts = useMemo(() => {
    const c = { registered: 0, payment_pending: 0, setup_pending: 0, onboarded: 0 };
    for (const e of entries) c[e.stage]++;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (stage && e.stage !== stage) return false;
      if (!q) return true;
      return (
        e.tenantName.toLowerCase().includes(q) ||
        e.contactName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      );
    });
  }, [entries, search, stage]);

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
          title="Onboarding"
          pill="Funnel"
          description="Every self-service signup, and exactly how far through setup each one got — from registration to a fully onboarded tenant."
        />

        <section className="stats">
          <article className="card stat">
            <div>
              <span>Registered</span>
              <h2>{String(counts.registered).padStart(2, "0")}</h2>
              <small>Email not verified yet</small>
            </div>
            <span className="icon-tile orange"><MailCheck size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>Payment pending</span>
              <h2>{String(counts.payment_pending).padStart(2, "0")}</h2>
              <small>Verified, not paid</small>
            </div>
            <span className="icon-tile blue"><CreditCard size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>Setting up</span>
              <h2>{String(counts.setup_pending).padStart(2, "0")}</h2>
              <small>Paid, company/branch pending</small>
            </div>
            <span className="icon-tile violet"><Building2 size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>Onboarded</span>
              <h2>{String(counts.onboarded).padStart(2, "0")}</h2>
              <small>Company &amp; branch created</small>
            </div>
            <span className="icon-tile green"><CheckCircle2 size={23} /></span>
          </article>
        </section>

        <section className="card catalogue">
          <CardHeading
            title="Signups"
            count={`${filtered.length} of ${entries.length}`}
            text="Newest first. A registered row has no tenant yet — it only becomes one once the email is verified."
          />
          <div className="filters">
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search onboarding"
              placeholder="Search by workspace, contact or email…"
            />
            <Select ariaLabel="Filter by stage" value={stage} onChange={setStage} options={STAGE_OPTIONS} />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>WORKSPACE</th>
                  <th>CONTACT</th>
                  <th>STAGE</th>
                  <th>STARTED</th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={4} widths={["55%", "60%", "45%", "40%"]} />}
                {!loading &&
                  filtered.map((e) => {
                    const meta = STAGE_META[e.stage];
                    const Icon = meta.icon;
                    const key = e.tenantId ?? e.registrationId;
                    return (
                      <tr key={key}>
                        <td>
                          {e.tenantId ? (
                            <Link href={`/tenants/${e.tenantId}`} className="tenant-cell">
                              <span className="tenant-avatar" style={{ background: "#696cff" }}>{initials(e.tenantName)}</span>
                              <span className="tenant-cell-copy">
                                <strong>{e.tenantName}</strong>
                                {e.paymentStatus && <small>{e.paymentStatus}</small>}
                              </span>
                            </Link>
                          ) : (
                            <span className="tenant-cell">
                              <span className="tenant-avatar" style={{ background: "#9294a5" }}>{initials(e.tenantName)}</span>
                              <span className="tenant-cell-copy">
                                <strong>{e.tenantName}</strong>
                                <small>No tenant yet</small>
                              </span>
                            </span>
                          )}
                        </td>
                        <td>
                          {e.contactName}
                          <span className="table-subtext">{e.email}</span>
                        </td>
                        <td>
                          <span className={meta.pill} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Icon size={13} /> {e.stageLabel}
                          </span>
                        </td>
                        <td>{fmtDate(e.createdAt)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!loading && !filtered.length && (
              <EmptyState
                icon={<Workflow size={28} />}
                title={error ? "Unable to load onboarding status" : entries.length ? "No entries match your filters" : "No signups yet"}
                text={
                  <span role={error ? "alert" : "status"}>
                    {error || (entries.length ? "Try a different search or stage." : "Self-service signups will show up here as they happen.")}
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
