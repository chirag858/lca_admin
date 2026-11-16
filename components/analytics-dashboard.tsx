"use client";
import { useEffect, useMemo, useState } from "react";
import { Building2, Users, IndianRupee, ShieldAlert, ShieldCheck, RefreshCcw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { StatusPill } from "./ui/status-pill";
import { RangeSelect, rangeCutoff, type AnalyticsRange } from "./ui/range-select";

type SubscriptionPackage = {
  code: string;
  displayName: string;
  monthlyPrice: number;
};

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";

type TenantUsage = {
  tenantId: number;
  tenantName: string;
  subscriptionPackage: string;
  maxFirms: number | null;
  firmsUsed: number;
  maxStaffTotal: number | null;
  staffUsed: number;
  maxStaffPerFirm: number | null;
  ownerEmail: string;
  isActive: boolean;
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  isAccessBlocked: boolean;
  createdAt?: string;
};

const DONUT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];
const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  Paid: "#22c55e",
  Pending: "#f59e0b",
  Failed: "#ef4444",
  Cancelled: "#94a3b8",
};

function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width={160} height={160}>
        <g transform="translate(70,70) rotate(-90)">
          <circle r={radius} fill="none" stroke="var(--border-soft, #e2e8f0)" strokeWidth={20} />
          {total > 0 &&
            segments.map((seg) => {
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const circle = (
                <circle
                  key={seg.label}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={20}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return circle;
            })}
        </g>
        <text x={70} y={66} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text-primary, #0f172a)">
          {total}
        </text>
        <text x={70} y={84} textAnchor="middle" fontSize={11} fill="var(--text-muted, #64748b)">
          total
        </text>
      </svg>
      <ul className="donut-legend">
        {segments.map((seg) => (
          <li key={seg.label}>
            <span className="dot" style={{ background: seg.color }} />
            {seg.label}
            <strong>{seg.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarRow({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label" title={label}>
        {label}
      </span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bar-value">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [range, setRange] = useState<AnalyticsRange>("all");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [tenantsData, packagesData] = await Promise.all([
          fetchJson<TenantUsage[]>("/api/tenants", { signal: controller.signal }, "Unable to load tenants."),
          fetchJson<SubscriptionPackage[]>(
            "/api/subscription-packages",
            { signal: controller.signal },
            "Unable to load subscription packages.",
          ),
        ]);
        if (!controller.signal.aborted) {
          setTenants(tenantsData);
          setPackages(packagesData);
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const rangedTenants = useMemo(() => {
    const cutoff = rangeCutoff(range);
    if (!cutoff) return tenants;
    return tenants.filter((t) => !t.createdAt || new Date(t.createdAt) >= cutoff);
  }, [tenants, range]);

  const stats = useMemo(() => {
    const revenue = rangedTenants.reduce((sum, t) => sum + (t.paymentStatus === "Paid" ? t.paymentAmount ?? 0 : 0), 0);
    return {
      tenants: rangedTenants.length,
      firms: rangedTenants.reduce((sum, t) => sum + t.firmsUsed, 0),
      staff: rangedTenants.reduce((sum, t) => sum + t.staffUsed, 0),
      revenue,
      blocked: rangedTenants.filter((t) => t.isAccessBlocked).length,
    };
  }, [rangedTenants]);

  const planSegments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of rangedTenants) counts.set(t.subscriptionPackage, (counts.get(t.subscriptionPackage) ?? 0) + 1);
    return Array.from(counts.entries()).map(([label, value], i) => ({
      label,
      value,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [rangedTenants]);

  const paymentSegments = useMemo(() => {
    const counts = new Map<PaymentStatus, number>();
    for (const t of rangedTenants) counts.set(t.paymentStatus, (counts.get(t.paymentStatus) ?? 0) + 1);
    return (["Paid", "Pending", "Failed", "Cancelled"] as PaymentStatus[])
      .filter((s) => counts.has(s))
      .map((label) => ({ label, value: counts.get(label) ?? 0, color: PAYMENT_COLORS[label] }));
  }, [rangedTenants]);

  const topTenantsByFirms = useMemo(
    () => [...rangedTenants].sort((a, b) => b.firmsUsed - a.firmsUsed).slice(0, 6),
    [rangedTenants],
  );
  const maxFirmsUsed = Math.max(1, ...topTenantsByFirms.map((t) => t.firmsUsed));

  const revenueByPlan = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of rangedTenants) {
      if (t.paymentStatus !== "Paid") continue;
      totals.set(t.subscriptionPackage, (totals.get(t.subscriptionPackage) ?? 0) + (t.paymentAmount ?? 0));
    }
    return packages
      .map((p) => ({ label: p.displayName, value: totals.get(p.code) ?? 0 }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rangedTenants, packages]);
  const maxRevenue = Math.max(1, ...revenueByPlan.map((r) => r.value));

  const statusSegments = useMemo(() => {
    const active = rangedTenants.filter((t) => t.isActive).length;
    const inactive = rangedTenants.length - active;
    return [
      { label: "Active", value: active, color: "#22c55e" },
      { label: "Inactive", value: inactive, color: "#94a3b8" },
    ].filter((s) => s.value > 0);
  }, [rangedTenants]);

  function capacityRatio(t: TenantUsage) {
    const firmRatio = t.maxFirms ? t.firmsUsed / t.maxFirms : 0;
    const staffRatio = t.maxStaffTotal ? t.staffUsed / t.maxStaffTotal : 0;
    return Math.max(firmRatio, staffRatio);
  }

  const nearLimitTenants = useMemo(
    () =>
      rangedTenants
        .map((t) => ({ tenant: t, ratio: capacityRatio(t) }))
        .filter((x) => x.ratio >= 0.6)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 6),
    [rangedTenants],
  );

  const recentTenants = useMemo(() => [...rangedTenants].slice(-6).reverse(), [rangedTenants]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

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
        title="Analytics Dashboard"
        description="Platform-wide usage, revenue and subscription analytics across all tenants."
        actions={<RangeSelect value={range} onChange={setRange} />}
        wrapActions={false}
      />

      <section className="stats">
        {[
          { label: "Tenants", value: stats.tenants, icon: ShieldCheck, color: "purple" },
          { label: "Firms provisioned", value: stats.firms, icon: Building2, color: "blue" },
          { label: "Staff provisioned", value: stats.staff, icon: Users, color: "green" },
          { label: "Revenue (paid)", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "orange" },
        ].map(({ label, value, icon: Icon, color }) => (
          <article className="card stat" key={label}>
            <div>
              <span>{label}</span>
              <h2>{loading ? "—" : value}</h2>
            </div>
            <span className={"icon-tile " + color}>
              <Icon size={23} />
            </span>
          </article>
        ))}
      </section>

      {!loading && !error && tenants.length === 0 ? (
        <section className="card catalogue">
          <EmptyState icon={<Building2 size={28} />} title="No data yet" text="Onboard a tenant to see analytics here." />
        </section>
      ) : !loading && !error && rangedTenants.length === 0 ? (
        <section className="card catalogue">
          <EmptyState icon={<Building2 size={28} />} title="No tenants in this range" text="Try a wider date range." />
        </section>
      ) : (
        <div className="analytics-grid">
          <section className="card catalogue">
            <CardHeading title="Tenants by plan" text="Distribution of subscription packages across tenants." />
            <Donut segments={planSegments} />
          </section>

          <section className="card catalogue">
            <CardHeading title="Payment status" text="Breakdown of tenant billing status." />
            <Donut
              segments={paymentSegments.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
            />
          </section>

          <section className="card catalogue">
            <CardHeading title="Active vs inactive" text="Tenant activation status across the platform." />
            <Donut segments={statusSegments} />
          </section>

          <section className="card catalogue">
            <CardHeading
              title="Nearing limit"
              count={nearLimitTenants.length || undefined}
              text="Tenants at 60%+ of their firm or staff cap."
            />
            <div className="bar-chart">
              {nearLimitTenants.length ? (
                nearLimitTenants.map(({ tenant: t, ratio }) => (
                  <BarRow
                    key={t.tenantId}
                    label={t.tenantName}
                    value={Math.round(ratio * 100)}
                    max={100}
                    color={ratio >= 1 ? "#ef4444" : ratio >= 0.8 ? "#f59e0b" : "#6366f1"}
                    suffix="%"
                  />
                ))
              ) : (
                <p className="text-muted">No tenants near their limits.</p>
              )}
            </div>
          </section>

          <section className="card catalogue">
            <CardHeading title="Top tenants by firms used" text="Highest firm usage across onboarded tenants." />
            <div className="bar-chart">
              {topTenantsByFirms.length ? (
                topTenantsByFirms.map((t, i) => (
                  <BarRow
                    key={t.tenantId}
                    label={t.tenantName}
                    value={t.firmsUsed}
                    max={maxFirmsUsed}
                    color={DONUT_COLORS[i % DONUT_COLORS.length]}
                  />
                ))
              ) : (
                <p className="text-muted">No tenants yet.</p>
              )}
            </div>
          </section>

          <section className="card catalogue">
            <CardHeading title="Revenue by plan" text="Paid revenue contribution per subscription package." />
            <div className="bar-chart">
              {revenueByPlan.length ? (
                revenueByPlan.map((r, i) => (
                  <BarRow
                    key={r.label}
                    label={r.label}
                    value={r.value}
                    max={maxRevenue}
                    color={DONUT_COLORS[i % DONUT_COLORS.length]}
                    suffix=" ₹"
                  />
                ))
              ) : (
                <p className="text-muted">No paid revenue yet.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {!loading && !error && recentTenants.length > 0 && (
        <section className="card catalogue">
          <div className="table-scroll">
           <CardHeading title="Recently onboarded tenants" count={`${recentTenants.length} shown`} text="Latest tenants with plan, usage and billing at a glance." />

            <table>
              <thead>
                <tr>
                  <th>TENANT</th>
                  <th>PLAN</th>
                  <th>FIRMS</th>
                  <th>STAFF</th>
                  <th>STATUS</th>
                  <th>PAYMENT</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((t) => (
                  <tr key={t.tenantId}>
                    <td>
                      <Link href={`/tenants/${t.tenantId}`} className="link-strong">
                        <strong>{t.tenantName}</strong>
                      </Link>
                    </td>
                    <td>{t.subscriptionPackage}</td>
                    <td>
                      {t.firmsUsed}/{t.maxFirms ?? "∞"}
                    </td>
                    <td>
                      {t.staffUsed}/{t.maxStaffTotal ?? "∞"}
                    </td>
                    <td>
                      <StatusPill on={t.isActive} />
                    </td>
                    <td>
                      <span className={`usage-pill usage-${t.paymentStatus === "Paid" ? "green" : t.paymentStatus === "Pending" ? "amber" : "red"}`}>
                        {t.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!!error && (
        <section className="card catalogue">
          <EmptyState
            icon={<ShieldAlert size={28} />}
            title="Unable to load analytics"
            text={<span role="alert">{error}</span>}
            action={
              <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            }
          />
        </section>
      )}
      </main>
    </div>
  );
}
