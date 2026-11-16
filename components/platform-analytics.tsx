"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Users, IndianRupee, Trophy, RefreshCcw, LogOut, UserMinus, Clock, Link2, Gauge } from "lucide-react";
import NextLink from "next/link";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { Skeleton, SkeletonChartCard } from "./ui/skeleton";
import { TenantCell } from "./ui/tenant-cell";
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
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  isActive: boolean;
  isAccessBlocked: boolean;
  subscriptionExpiresAt: string | null;
  paymentLinkUrl: string | null;
  maxFirms: number | null;
  firmsUsed: number;
  maxStaffTotal: number | null;
  staffUsed: number;
  createdAt?: string;
};

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#06b6d4", "#a855f7", "#ef4444"];
const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  Paid: "#22c55e",
  Pending: "#f59e0b",
  Failed: "#ef4444",
  Cancelled: "#94a3b8",
};

function BarRow({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bar-row">
      <span className="bar-label" title={label}>
        {label}
      </span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="bar-value">{display ?? value}</span>
    </div>
  );
}

function Histogram({ bins, color }: { bins: { label: string; value: number }[]; color: string }) {
  const max = Math.max(1, ...bins.map((b) => b.value));
  return (
    <div className="histogram">
      {bins.map((b) => (
        <div className="histogram-col" key={b.label}>
          <div className="histogram-bar-wrap">
            <div
              className="histogram-bar"
              style={{ height: `${Math.max(3, (b.value / max) * 100)}%`, background: color }}
              title={`${b.label}: ${b.value}`}
            />
          </div>
          <span className="histogram-label">{b.label}</span>
          <span className="histogram-value">{b.value}</span>
        </div>
      ))}
    </div>
  );
}

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

function LineChart({ points, color, valuePrefix }: { points: { label: string; value: number }[]; color: string; valuePrefix?: string }) {
  const width = 600;
  const height = 180;
  const padding = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding + i * stepX,
    y: height - padding - (p.value / max) * (height - padding * 2),
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1]?.x.toFixed(1)},${height - padding} L${coords[0]?.x.toFixed(1)},${height - padding} Z`;
  return (
    <div className="linechart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-soft, #e2e8f0)" />
        {points.length > 0 && <path d={area} fill={color} opacity={0.12} />}
        {points.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2.5} />}
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={3.5} fill={color}>
            <title>
              {points[i].label}: {valuePrefix ?? ""}
              {points[i].value}
            </title>
          </circle>
        ))}
      </svg>
      <div className="linechart-labels">
        {points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

type Bucket = { label: string; start: Date; end: Date };

function buildBuckets(range: AnalyticsRange, tenants: TenantUsage[]): Bucket[] {
  const now = new Date();
  const buckets: Bucket[] = [];
  if (range === "weekly") {
    for (let i = 6; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      buckets.push({ label: start.toLocaleDateString("en-IN", { weekday: "short" }), start, end });
    }
    return buckets;
  }
  if (range === "quarterly") {
    for (let i = 12; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      buckets.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, start, end });
    }
    return buckets;
  }
  const monthCount =
    range === "yearly"
      ? 12
      : (() => {
          const earliest = tenants.reduce<Date | null>((min, t) => {
            if (!t.createdAt) return min;
            const d = new Date(t.createdAt);
            return !min || d < min ? d : min;
          }, null);
          if (!earliest) return 12;
          const months = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
          return Math.min(24, Math.max(1, months));
        })();
  for (let i = monthCount - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    buckets.push({ label: start.toLocaleDateString("en-IN", { month: "short" }), start, end });
  }
  return buckets;
}

export default function PlatformAnalytics() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
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
        const [packagesData, tenantsData] = await Promise.all([
          fetchJson<SubscriptionPackage[]>(
            "/api/subscription-packages",
            { signal: controller.signal },
            "Unable to load subscription packages.",
          ),
          fetchJson<TenantUsage[]>("/api/tenants", { signal: controller.signal }, "Unable to load tenants."),
        ]);
        if (!controller.signal.aborted) {
          setPackages(packagesData);
          setTenants(tenantsData);
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

  const planSales = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of rangedTenants) counts.set(t.subscriptionPackage, (counts.get(t.subscriptionPackage) ?? 0) + 1);
    return packages
      .map((p) => ({ code: p.code, label: p.displayName, value: counts.get(p.code) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [rangedTenants, packages]);
  const maxPlanSales = Math.max(1, ...planSales.map((p) => p.value));
  const bestSellingPlan = planSales.find((p) => p.value > 0)?.label ?? "—";

  const revenueByPlan = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of rangedTenants) {
      if (t.paymentStatus !== "Paid") continue;
      totals.set(t.subscriptionPackage, (totals.get(t.subscriptionPackage) ?? 0) + (t.paymentAmount ?? 0));
    }
    return packages
      .map((p) => ({ code: p.code, label: p.displayName, value: totals.get(p.code) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [rangedTenants, packages]);
  const maxRevenueByPlan = Math.max(1, ...revenueByPlan.map((r) => r.value));

  const stats = useMemo(() => {
    const paidTenants = rangedTenants.filter((t) => t.paymentStatus === "Paid");
    const revenue = paidTenants.reduce((sum, t) => sum + (t.paymentAmount ?? 0), 0);
    return {
      onboarded: rangedTenants.length,
      revenue,
      avgRevenue: paidTenants.length ? revenue / paidTenants.length : 0,
      activeTenants: rangedTenants.filter((t) => t.isActive).length,
    };
  }, [rangedTenants]);

  const paymentStatusSegments = useMemo(() => {
    const counts = new Map<PaymentStatus, number>();
    for (const t of rangedTenants) counts.set(t.paymentStatus, (counts.get(t.paymentStatus) ?? 0) + 1);
    return (["Paid", "Pending", "Failed", "Cancelled"] as PaymentStatus[])
      .filter((s) => counts.has(s))
      .map((label) => ({ label, value: counts.get(label) ?? 0, color: PAYMENT_COLORS[label] }));
  }, [rangedTenants]);

  const revenueHistogram = useMemo(() => {
    const bins = [
      { label: "₹0", min: 0, max: 0 },
      { label: "1–999", min: 1, max: 999 },
      { label: "1k–4.9k", min: 1000, max: 4999 },
      { label: "5k–9.9k", min: 5000, max: 9999 },
      { label: "10k+", min: 10000, max: Infinity },
    ];
    return bins.map((b) => ({
      label: b.label,
      value: rangedTenants.filter((t) => t.paymentAmount !== null && t.paymentAmount >= b.min && t.paymentAmount <= b.max).length,
    }));
  }, [rangedTenants]);

  const topTenantsByRevenue = useMemo(
    () =>
      [...rangedTenants]
        .filter((t) => t.paymentStatus === "Paid" && (t.paymentAmount ?? 0) > 0)
        .sort((a, b) => (b.paymentAmount ?? 0) - (a.paymentAmount ?? 0))
        .slice(0, 6),
    [rangedTenants],
  );
  const maxTenantRevenue = Math.max(1, ...topTenantsByRevenue.map((t) => t.paymentAmount ?? 0));

  const churn = useMemo(() => {
    const cancelled = rangedTenants.filter((t) => t.paymentStatus === "Cancelled").length;
    const lapsed = rangedTenants.filter((t) => t.isAccessBlocked && t.paymentStatus === "Paid").length;
    const total = rangedTenants.length;
    return {
      cancelled,
      lapsed,
      rate: total ? ((cancelled + lapsed) / total) * 100 : 0,
    };
  }, [rangedTenants]);

  const mrrSplit = useMemo(() => {
    let recurring = 0;
    let atRisk = 0;
    for (const t of rangedTenants) {
      if (t.paymentStatus !== "Paid" || !t.paymentAmount) continue;
      if (t.isAccessBlocked) atRisk += t.paymentAmount;
      else recurring += t.paymentAmount;
    }
    return { recurring, atRisk };
  }, [rangedTenants]);
  const maxMrr = Math.max(1, mrrSplit.recurring, mrrSplit.atRisk);

  const expiringSoon = useMemo(() => {
    const now = new Date().getTime();
    return rangedTenants
      .filter((t) => t.subscriptionExpiresAt && !t.isAccessBlocked)
      .map((t) => ({ tenant: t, days: Math.ceil((new Date(t.subscriptionExpiresAt as string).getTime() - now) / 86400000) }))
      .filter((x) => x.days >= 0 && x.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 8);
  }, [rangedTenants]);

  const pendingLinkTenants = useMemo(
    () => rangedTenants.filter((t) => t.isAccessBlocked && t.paymentStatus === "Pending"),
    [rangedTenants],
  );

  const buckets = useMemo(() => buildBuckets(range, tenants), [range, tenants]);
  const hasCreatedAt = tenants.some((t) => !!t.createdAt);

  const newTenantsTrend = useMemo(
    () =>
      buckets.map((b) => ({
        label: b.label,
        value: tenants.filter((t) => t.createdAt && new Date(t.createdAt) >= b.start && new Date(t.createdAt) <= b.end).length,
      })),
    [buckets, tenants],
  );

  const revenueTrend = useMemo(
    () =>
      buckets.map((b) => ({
        label: b.label,
        value: tenants
          .filter((t) => t.createdAt && t.paymentStatus === "Paid" && new Date(t.createdAt) >= b.start && new Date(t.createdAt) <= b.end)
          .reduce((sum, t) => sum + (t.paymentAmount ?? 0), 0),
      })),
    [buckets, tenants],
  );

  const utilizationHistogram = useMemo(() => {
    const bins = [
      { label: "0–20%", min: 0, max: 20 },
      { label: "20–40%", min: 20, max: 40 },
      { label: "40–60%", min: 40, max: 60 },
      { label: "60–80%", min: 60, max: 80 },
      { label: "80–100%+", min: 80, max: Infinity },
    ];
    const ratios = rangedTenants.map((t) => {
      const firmRatio = t.maxFirms ? t.firmsUsed / t.maxFirms : 0;
      const staffRatio = t.maxStaffTotal ? t.staffUsed / t.maxStaffTotal : 0;
      return Math.max(firmRatio, staffRatio) * 100;
    });
    return bins.map((b) => ({
      label: b.label,
      value: ratios.filter((r) => r >= b.min && r < (b.max === Infinity ? Infinity : b.max + 0.001)).length,
    }));
  }, [rangedTenants]);

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
          title="Analytics"
          description="Revenue, tenant growth and plan performance across the platform."
          actions={<RangeSelect value={range} onChange={setRange} />}
          wrapActions={false}
        />

        <section className="stats">
          {[
            { label: "Tenants onboarded", value: stats.onboarded, icon: Users, color: "purple" },
            { label: "Revenue (paid)", value: `₹${stats.revenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "orange" },
            { label: "Avg revenue / tenant", value: `₹${stats.avgRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: BarChart3, color: "blue" },
            { label: "Best-selling plan", value: bestSellingPlan, icon: Trophy, color: "green" },
          ].map(({ label, value, icon: Icon, color }) => (
            <article className="card stat" key={label}>
              <div>
                <span>{label}</span>
                <h2>{loading ? <Skeleton width={56} height={24} /> : value}</h2>
              </div>
              <span className={"icon-tile " + color}>
                <Icon size={23} />
              </span>
            </article>
          ))}
        </section>

        <section className="stats">
          {[
            { label: "Churn / cancellation rate", value: `${churn.rate.toFixed(1)}%`, icon: UserMinus, color: "orange" },
            { label: "Expiring in 7 days", value: expiringSoon.length, icon: Clock, color: "orange" },
            { label: "Pending payment links", value: pendingLinkTenants.length, icon: Link2, color: "blue" },
            { label: "Active tenants", value: stats.activeTenants, icon: Gauge, color: "green" },
          ].map(({ label, value, icon: Icon, color }) => (
            <article className="card stat" key={label}>
              <div>
                <span>{label}</span>
                <h2>{loading ? <Skeleton width={56} height={24} /> : value}</h2>
              </div>
              <span className={"icon-tile " + color}>
                <Icon size={23} />
              </span>
            </article>
          ))}
        </section>

        {loading ? (
          <>
            <div className="analytics-grid">
              <SkeletonChartCard />
              <SkeletonChartCard />
            </div>
            <div className="analytics-grid">
              <SkeletonChartCard height={140} />
              <SkeletonChartCard height={140} />
            </div>
          </>
        ) : !error && tenants.length === 0 ? (
          <section className="card catalogue">
            <EmptyState icon={<Users size={28} />} title="No data yet" text="Onboard a tenant to see analytics here." />
          </section>
        ) : !error && rangedTenants.length === 0 ? (
          <section className="card catalogue">
            <EmptyState icon={<Users size={28} />} title="No tenants in this range" text="Try a wider date range." />
          </section>
        ) : (
          <>
          {hasCreatedAt ? (
            <div className="analytics-grid">
              <section className="card catalogue">
                <CardHeading title="New tenants onboarded" text="Tenant growth over the selected period." />
                <LineChart points={newTenantsTrend} color="#6366f1" />
              </section>
              <section className="card catalogue">
                <CardHeading title="Revenue trend" text="Paid revenue by tenant onboarding period." />
                <LineChart points={revenueTrend} color="#22c55e" valuePrefix="₹" />
              </section>
            </div>
          ) : (
            <section className="card catalogue">
              {/* <EmptyState icon={<Clock size={28} />} title="Trend charts need tenant creation dates" text="The tenants API does not return a creation date yet, so growth and revenue trends can't be plotted over time." /> */}
            </section>
          )}

          <div className="analytics-grid">
            <section className="card catalogue">
              <CardHeading title="Which plan sells the most" text="Tenants onboarded per subscription package." />
              <div className="bar-chart">
                {planSales.length ? (
                  planSales.map((p, i) => (
                    <BarRow key={p.code} label={p.label} value={p.value} max={maxPlanSales} color={COLORS[i % COLORS.length]} display={`${p.value} tenants`} />
                  ))
                ) : (
                  <p className="text-muted">No packages yet.</p>
                )}
              </div>
            </section>

            <section className="card catalogue">
              <CardHeading title="Revenue by plan" text="Paid revenue contribution per subscription package." />
              <div className="bar-chart">
                {revenueByPlan.some((r) => r.value > 0) ? (
                  revenueByPlan.map((r, i) => (
                    <BarRow key={r.code} label={r.label} value={r.value} max={maxRevenueByPlan} color={COLORS[i % COLORS.length]} display={`₹${r.value.toLocaleString("en-IN")}`} />
                  ))
                ) : (
                  <p className="text-muted">No paid revenue yet.</p>
                )}
              </div>
            </section>

            <section className="card catalogue">
              <CardHeading title="Payment status" text="Breakdown of tenant billing status." />
              <Donut segments={paymentStatusSegments} />
            </section>

            <section className="card catalogue">
              <CardHeading title="Revenue per tenant distribution" text="How many tenants fall into each billing bracket." />
              <Histogram bins={revenueHistogram} color="#6366f1" />
            </section>

            <section className="card catalogue">
              <CardHeading title="MRR vs at-risk revenue" text="Recurring revenue from healthy accounts vs revenue from tenants whose access is already blocked." />
              <div className="bar-chart">
                <BarRow label="Healthy MRR" value={mrrSplit.recurring} max={maxMrr} color="#22c55e" display={`₹${mrrSplit.recurring.toLocaleString("en-IN")}`} />
                <BarRow label="At-risk (blocked)" value={mrrSplit.atRisk} max={maxMrr} color="#ef4444" display={`₹${mrrSplit.atRisk.toLocaleString("en-IN")}`} />
              </div>
            </section>

            <section className="card catalogue">
              <CardHeading title="Firm & staff utilization" text="Current share of tenants in each capacity bracket (snapshot, not historical)." />
              <Histogram bins={utilizationHistogram} color="#f59e0b" />
            </section>

            <section className="card catalogue" style={{ gridColumn: "1 / -1" }}>
              <CardHeading title="Top tenants by revenue" text="Highest-paying tenants in the selected range." />
              <div className="bar-chart">
                {topTenantsByRevenue.length ? (
                  topTenantsByRevenue.map((t, i) => (
                    <BarRow
                      key={t.tenantId}
                      label={t.tenantName}
                      value={t.paymentAmount ?? 0}
                      max={maxTenantRevenue}
                      color={COLORS[i % COLORS.length]}
                      display={`₹${(t.paymentAmount ?? 0).toLocaleString("en-IN")}`}
                    />
                  ))
                ) : (
                  <p className="text-muted">No paid tenants yet.</p>
                )}
              </div>
            </section>

            <section className="card catalogue" style={{ gridColumn: "1 / -1" }}>
              <CardHeading title="Expiring in the next 7 days" count={expiringSoon.length || undefined} text="Renewal risk — act before access gets blocked." />
              {expiringSoon.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TENANT</th>
                        <th>PLAN</th>
                        <th>EXPIRES IN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringSoon.map(({ tenant: t, days }) => (
                        <tr key={t.tenantId}>
                          <td>
                            <NextLink href={`/tenants/${t.tenantId}`} className="link-strong">
                              <strong>{t.tenantName}</strong>
                            </NextLink>
                          </td>
                          <td>{t.subscriptionPackage}</td>
                          <td>
                            <span className={`usage-pill usage-${days <= 2 ? "red" : "amber"}`}>{days === 0 ? "Today" : `${days}d`}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted" style={{ padding: "0 24px 24px" }}>
                  No tenants expiring soon.
                </p>
              )}
            </section>

            <section className="card catalogue" style={{ gridColumn: "1 / -1" }}>
              <CardHeading title="Pending payment links" count={pendingLinkTenants.length || undefined} text="Tenants blocked and waiting on a payment link to come back online." />
              {pendingLinkTenants.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TENANT</th>
                        <th>PLAN</th>
                        <th>AMOUNT</th>
                        <th>PAYMENT LINK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingLinkTenants.map((t) => (
                        <tr key={t.tenantId}>
                          <td>
                            <TenantCell tenantId={t.tenantId} tenantName={t.tenantName} />
                          </td>
                          <td>{t.subscriptionPackage}</td>
                          <td>
                            <strong>{t.paymentAmount !== null ? `₹${t.paymentAmount.toLocaleString("en-IN")}` : "—"}</strong>
                          </td>
                          <td>
                            {t.paymentLinkUrl ? (
                              <a href={t.paymentLinkUrl} target="_blank" rel="noreferrer" className="link-strong">
                                <Link2 size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                                Open link
                              </a>
                            ) : (
                              <span className="usage-pill usage-amber">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted" style={{ padding: "0 24px 24px" }}>
                  No tenants pending a payment link.
                </p>
              )}
            </section>
          </div>
          </>
        )}

        {!!error && (
          <section className="card catalogue">
            <EmptyState
              icon={<BarChart3 size={28} />}
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
