"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CreditCard,
  LogOut,
  RefreshCcw,
  Users,
} from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { StatusPill } from "./ui/status-pill";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";

type Firm = {
  firmId: number;
  firmName: string;
  maxEmployees: number;
  employeesUsed: number;
  isActive: boolean;
  createdAt: string;
};

type TenantDetail = {
  tenantId: number;
  tenantName: string;
  subscriptionPackage: string;
  isCustomOverride: boolean;
  maxFirms: number | null;
  firmsUsed: number;
  maxStaffPerFirm: number | null;
  maxStaffTotal: number | null;
  staffUsed: number;
  isActive: boolean;
  createdAt: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  paymentLinkUrl: string | null;
  razorpayPaymentId: string | null;
  paymentReceivedAt: string | null;
  subscriptionExpiresAt: string | null;
  isAccessBlocked: boolean;
  firms: Firm[];
};

function fmtLimit(value: number | null) {
  return value === null || value >= 2147483647 ? "∞" : String(value);
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fmtMoney(value: number | null) {
  if (value === null) return "—";
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const PAYMENT_TONE: Record<PaymentStatus, "green" | "amber" | "red"> = {
  Paid: "green",
  Pending: "amber",
  Failed: "red",
  Cancelled: "red",
};

type Package = {
  code: string;
  displayName: string;
  defaultMaxFirms: number | null;
  defaultMaxStaffPerFirm: number | null;
  defaultMaxStaffTotal: number | null;
  monthlyPrice: number;
};

function fmtShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function tenureText(createdAt: string) {
  const days = daysBetween(new Date(createdAt), new Date());
  if (days < 1) return "Joined today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} on the platform`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} on the platform`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years} yr${years === 1 ? "" : "s"}${remMonths ? ` ${remMonths} mo` : ""} on the platform`;
}

function expiryText(expiresAt: string | null, blocked: boolean) {
  if (!expiresAt) return blocked ? "No active subscription" : "No expiry recorded";
  const days = daysBetween(new Date(), new Date(expiresAt));
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `Renews in ${days} day${days === 1 ? "" : "s"}`;
}

function UsageBar({ used, max }: { used: number; max: number | null }) {
  const pct = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const tone = pct >= 100 ? "var(--danger)" : pct >= 75 ? "var(--warning)" : "var(--success)";
  return (
    <div className="breakdown-track" style={{ marginTop: 6 }}>
      <span style={{ width: `${max ? pct : 0}%`, background: tone }} />
    </div>
  );
}

export default function TenantDetailPage({ tenantId }: { tenantId: number }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [resending, setResending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const { toast, show: notify, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<TenantDetail>(
          `/api/tenants/${tenantId}`,
          { signal: controller.signal },
          "Unable to load tenant.",
        );
        if (!controller.signal.aborted) setTenant(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load tenant.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [tenantId, retry]);

  useEffect(() => {
    const controller = new AbortController();
    fetchJson<Package[]>("/api/subscription-packages", { signal: controller.signal }, "Unable to load packages.")
      .then((data) => {
        if (!controller.signal.aborted) setPackages(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  async function resendPaymentLink() {
    if (!tenant) return;
    setResending(true);
    try {
      const result = await fetchJson<{ paymentLinkUrl: string; emailSent: boolean }>(
        `/api/tenants/${tenant.tenantId}/resend-payment-link`,
        { method: "POST" },
        "Unable to resend payment link.",
      );
      notify(
        result.emailSent
          ? `Payment link resent to ${tenant.ownerEmail}.`
          : "Payment link created, but the email could not be sent.",
      );
      setRetry((n) => n + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to resend payment link.");
    } finally {
      setResending(false);
    }
  }

  async function markPaid() {
    if (!tenant) return;
    if (!window.confirm("Mark this tenant as paid and grant a 1-month subscription?")) return;
    setMarkingPaid(true);
    try {
      await fetchJson(`/api/tenants/${tenant.tenantId}/mark-paid`, { method: "POST" }, "Unable to mark tenant as paid.");
      notify("Tenant marked as paid.");
      setRetry((n) => n + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to mark tenant as paid.");
    } finally {
      setMarkingPaid(false);
    }
  }

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
            title={tenant ? tenant.tenantName : loading ? "Loading…" : "Tenant"}
            pill={tenant?.isCustomOverride ? "Custom override" : undefined}
            description="Full tenant detail: plan, usage, firms, and payment status."
            actions={
              <button type="button" className="button" onClick={() => router.push("/")}>
                <ArrowLeft size={16} /> Back to tenants
              </button>
            }
          />

          {error && (
            <section className="card module-placeholder">
              <h2>Unable to load tenant</h2>
              <p role="alert">{error}</p>
              <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            </section>
          )}

          {!error && (loading || !tenant) && (
            <section className="card">
              <EmptyState icon={<Building2 size={28} />} title="Loading tenant…" text={null} />
            </section>
          )}

          {!error && tenant && (
            <>
              <div className="stats">
                <article className="card stat">
                  <div>
                    <span>Status</span>
                    <h2>
                      <StatusPill on={tenant.isActive} />
                    </h2>
                    <small className="low">{tenureText(tenant.createdAt)}</small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Plan</span>
                    <h2 style={{ fontSize: 20 }}>{tenant.subscriptionPackage}</h2>
                    <small className="low">{expiryText(tenant.subscriptionExpiresAt, tenant.isAccessBlocked)}</small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Firms</span>
                    <h2>
                      {tenant.firmsUsed}/{fmtLimit(tenant.maxFirms)}
                    </h2>
                    <UsageBar used={tenant.firmsUsed} max={tenant.maxFirms} />
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Staff</span>
                    <h2>
                      {tenant.staffUsed}/{fmtLimit(tenant.maxStaffTotal)}
                    </h2>
                    <UsageBar used={tenant.staffUsed} max={tenant.maxStaffTotal} />
                  </div>
                </article>
              </div>

              <section className="card catalogue">
                <CardHeading title="Subscription" text="Plan, limits, and renewal timeline." />
                <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                  <label>
                    <span>Plan</span>
                    <p>
                      {tenant.subscriptionPackage}
                      {tenant.isCustomOverride && (
                        <span className="pill" style={{ marginLeft: 8 }}>
                          Custom override
                        </span>
                      )}
                    </p>
                  </label>
                  <label>
                    <span>Monthly price</span>
                    <p>
                      {(() => {
                        const pkg = packages.find((p) => p.code === tenant.subscriptionPackage);
                        return pkg ? fmtMoney(pkg.monthlyPrice) : "—";
                      })()}
                    </p>
                  </label>
                  <label>
                    <span>Max firms</span>
                    <p>{fmtLimit(tenant.maxFirms)}</p>
                  </label>
                  <label>
                    <span>Max staff / firm</span>
                    <p>{fmtLimit(tenant.maxStaffPerFirm)}</p>
                  </label>
                  <label>
                    <span>Max staff total</span>
                    <p>{fmtLimit(tenant.maxStaffTotal)}</p>
                  </label>
                  <label>
                    <span>Tenant created</span>
                    <p>{fmtDate(tenant.createdAt)}</p>
                  </label>
                  <label>
                    <span>Subscription renewal</span>
                    <p>
                      <CalendarClock size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                      {fmtShortDate(tenant.subscriptionExpiresAt)}
                      {tenant.subscriptionExpiresAt && (
                        <span className="low" style={{ marginLeft: 8 }}>
                          ({expiryText(tenant.subscriptionExpiresAt, tenant.isAccessBlocked)})
                        </span>
                      )}
                    </p>
                  </label>
                </div>
              </section>

              <section className="card catalogue">
                <CardHeading title="Owner" text="The tenant owner's account." />
                <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                  <label>
                    <span>Name</span>
                    <p>
                      {tenant.ownerFirstName || tenant.ownerLastName
                        ? `${tenant.ownerFirstName ?? ""} ${tenant.ownerLastName ?? ""}`.trim()
                        : "—"}
                    </p>
                  </label>
                  <label>
                    <span>Username</span>
                    <p>{tenant.ownerUsername}</p>
                  </label>
                  <label>
                    <span>Email</span>
                    <p>{tenant.ownerEmail}</p>
                  </label>
                  <label>
                    <span>Tenant created</span>
                    <p>{fmtDate(tenant.createdAt)}</p>
                  </label>
                </div>
              </section>

              <section className="card catalogue">
                <CardHeading
                  title="Payment"
                  text="Subscription payment status and Razorpay details."
                >
                  <div style={{ display: "flex", gap: 8 }}>
                    {tenant.isAccessBlocked && (
                      <button type="button" className="button" disabled={resending} onClick={resendPaymentLink}>
                        <RefreshCcw size={15} /> {resending ? "Sending…" : "Send payment link"}
                      </button>
                    )}
                    {tenant.isAccessBlocked && (
                      <button type="button" className="button" disabled={markingPaid} onClick={markPaid}>
                        <CreditCard size={15} /> {markingPaid ? "Marking…" : "Mark as paid"}
                      </button>
                    )}
                  </div>
                </CardHeading>
                <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                  <label>
                    <span>Status</span>
                    <p>
                      <span
                        className={`usage-pill usage-${
                          tenant.paymentStatus === "Paid" && tenant.isAccessBlocked
                            ? "red"
                            : PAYMENT_TONE[tenant.paymentStatus]
                        }`}
                      >
                        {tenant.paymentStatus === "Paid" && tenant.isAccessBlocked ? "Expired" : tenant.paymentStatus}
                      </span>
                    </p>
                  </label>
                  <label>
                    <span>Amount</span>
                    <p>{fmtMoney(tenant.paymentAmount)}</p>
                  </label>
                  <label>
                    <span>Payment link</span>
                    <p>
                      {tenant.paymentLinkUrl ? (
                        <a href={tenant.paymentLinkUrl} target="_blank" rel="noreferrer">
                          {tenant.paymentLinkUrl}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </label>
                  <label>
                    <span>Razorpay payment ID</span>
                    <p>{tenant.razorpayPaymentId ?? "—"}</p>
                  </label>
                  <label>
                    <span>Paid at</span>
                    <p>{fmtDate(tenant.paymentReceivedAt)}</p>
                  </label>
                  <label>
                    <span>Subscription {tenant.isAccessBlocked ? "expired" : "renews"}</span>
                    <p>{fmtDate(tenant.subscriptionExpiresAt)}</p>
                  </label>
                </div>
              </section>

              <section className="card catalogue">
                <CardHeading
                  title="Firms"
                  count={`${tenant.firms.length} firm${tenant.firms.length === 1 ? "" : "s"}`}
                  text="Every firm under this tenant."
                />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>FIRM</th>
                        <th>STAFF</th>
                        <th>STATUS</th>
                        <th>CREATED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.firms.map((f) => (
                        <tr key={f.firmId}>
                          <td>
                            <strong>{f.firmName}</strong>
                          </td>
                          <td>
                            {f.employeesUsed}/{fmtLimit(f.maxEmployees)}
                          </td>
                          <td>
                            <StatusPill on={f.isActive} />
                          </td>
                          <td>{fmtDate(f.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!tenant.firms.length && (
                    <EmptyState
                      icon={<Users size={28} />}
                      title="No firms yet"
                      text="This tenant hasn't created any firms."
                    />
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
