"use client";
import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Calculator,
  ChevronDown,
  ChevronRight,
  Contact,
  CreditCard,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Info,
  Link2,
  LayoutGrid,
  LogOut,
  MapPin,
  Package,
  RefreshCcw,
  Shield,
  ShoppingCart,
  Tags,
  Trash2,
  User as UserIcon,
  UserCog,
  Users,
} from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { Skeleton, SkeletonStats, SkeletonFields } from "./ui/skeleton";
import { StatusPill } from "./ui/status-pill";
import { Toast } from "./ui/toast";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { useToast } from "@/lib/hooks/use-toast";

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";

type Branch = {
  branchId: number;
  branchName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  contactNumber: string | null;
  isActive: boolean;
  createdAt: string;
};

type Firm = {
  firmId: number;
  firmName: string;
  maxEmployees: number;
  employeesUsed: number;
  isActive: boolean;
  createdAt: string;
  gstNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contactNumber: string | null;
  email: string | null;
  branches: Branch[];
};

type PaymentHistoryEntry = {
  paymentHistoryId: number;
  subscriptionPackage: string;
  amount: number | null;
  status: PaymentStatus;
  razorpayPaymentId: string | null;
  razorpayPaymentLinkId: string | null;
  subscriptionExpiresAt: string | null;
  note: string | null;
  createdAt: string;
};

type TenantDetail = {
  tenantId: number;
  tenantName: string;
  sourceUrl: string | null;
  subscriptionPackage: string;
  isCustomOverride: boolean;
  maxFirms: number | null;
  firmsUsed: number;
  maxStaffPerFirm: number | null;
  maxStaffTotal: number | null;
  staffUsed: number;
  maxProducts: number | null;
  maxCategories: number | null;
  maxCategoryMappings: number | null;
  maxTransportFirms: number | null;
  maxAttributes: number | null;
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
  onboardingStage: "payment_pending" | "setup_pending" | "onboarded";
  onboardingStageLabel: string;
  firms: Firm[];
  paymentHistory: PaymentHistoryEntry[];
  resourceUsage: ResourceUsageItem[];
  resourceLimits: Record<string, number | null>;
};

type ResourceUsageItem = {
  key: string;
  label: string;
  used: number;
  max: number | null;
};

/** Generic resource-limit keys (see Backend.Api's ResourceKeys) shown in Plan limits,
 * beyond the fixed max* columns Tenant already has. */
const RESOURCE_LIMIT_FIELDS: { key: string; label: string }[] = [
  { key: "customers", label: "Max customers" },
  { key: "quotations", label: "Max quotations" },
  { key: "roles", label: "Max roles" },
  { key: "product_images_per_product", label: "Max images per product" },
];

const RESOURCE_USAGE_ICONS: Record<string, typeof Package> = {
  products: Package,
  categories: Tags,
  category_mappings: Link2,
  customers: Users,
  quotations: FileText,
  roles: Shield,
  orders: ShoppingCart,
  images: ImageIcon,
  staff: UserCog,
  branches: GitBranch,
  contacts: Contact,
  accounting_syncs: Calculator,
};

const NOT_YET_TRACKED = ["Suppliers", "Purchase orders", "Godowns", "Barcode labels", "Transport firms", "Attributes"];

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

function cityState(city: string | null, state: string | null) {
  if (!city && !state) return "—";
  return [city, state].filter(Boolean).join(", ");
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

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "companies", label: "Companies & Branches", icon: Building2 },
  { key: "payment", label: "Payment & Subscription", icon: CreditCard },
  { key: "owner", label: "Owner", icon: UserIcon },
  { key: "danger", label: "Danger zone", icon: Shield },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function TenantDetailPage({ tenantId }: { tenantId: number }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [resending, setResending] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [expandedFirms, setExpandedFirms] = useState<Set<number>>(new Set());
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

  async function resyncLimits() {
    if (!tenant) return;
    setResyncing(true);
    try {
      await fetchJson(`/api/tenants/${tenant.tenantId}/resync-limits`, { method: "POST" }, "Unable to resync plan limits.");
      notify("Plan limits resynced from the current plan.");
      setRetry((n) => n + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to resync plan limits.");
    } finally {
      setResyncing(false);
    }
  }

  async function deleteTenant() {
    if (!tenant) return;
    setConfirmDeleteOpen(false);
    setDeleting(true);
    try {
      await fetchJson(`/api/tenants/${tenant.tenantId}`, { method: "DELETE" }, "Unable to delete tenant.");
      router.replace("/tenants");
      router.refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to delete tenant.");
      setDeleting(false);
    }
  }

  function toggleFirm(firmId: number) {
    setExpandedFirms((prev) => {
      const next = new Set(prev);
      if (next.has(firmId)) next.delete(firmId);
      else next.add(firmId);
      return next;
    });
  }

  const totalBranches = tenant ? tenant.firms.reduce((sum, f) => sum + (f.branches?.length ?? 0), 0) : 0;

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
            title={tenant ? tenant.tenantName : loading ? "" : "Tenant"}
            pill={tenant?.isCustomOverride ? "Custom override" : undefined}
            description="Full tenant detail: plan, usage, companies, branches, and payment status."
            actions={
              <button type="button" className="button" onClick={() => router.push("/tenants")}>
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
            <>
              <SkeletonStats />
              <div className="tab-nav" aria-hidden="true">
                {TABS.map((tab) => (
                  <span key={tab.key} style={{ padding: "10px 16px" }}>
                    <Skeleton width={70 + tab.label.length} height={13} />
                  </span>
                ))}
              </div>
              <section className="card catalogue">
                <div style={{ padding: 24, display: "grid", gap: 8 }}>
                  <Skeleton width={180} height={16} />
                  <Skeleton width={260} height={12} />
                </div>
                <SkeletonFields />
              </section>
            </>
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
                    <small className="text-muted">{tenureText(tenant.createdAt)}</small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Plan</span>
                    <h2 style={{ fontSize: 20 }}>{tenant.subscriptionPackage}</h2>
                    <small className={tenant.isAccessBlocked ? "low" : "text-muted"}>{expiryText(tenant.subscriptionExpiresAt, tenant.isAccessBlocked)}</small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Companies</span>
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
                <article className="card stat">
                  <div>
                    <span>Onboarding</span>
                    <h2 style={{ fontSize: 15 }}>
                      <span className={`usage-pill usage-${tenant.onboardingStage === "onboarded" ? "green" : "amber"}`}>
                        {tenant.onboardingStageLabel}
                      </span>
                    </h2>
                  </div>
                </article>
              </div>

              <nav className="tab-nav" role="tablist">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const count =
                    tab.key === "companies"
                      ? tenant.firms.length
                      : tab.key === "payment" && tenant.isAccessBlocked
                        ? 1
                        : undefined;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      className={activeTab === tab.key ? "active" : ""}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <Icon size={15} /> {tab.label}
                      {count !== undefined && <span className="tab-count">{count}</span>}
                    </button>
                  );
                })}
              </nav>

              {activeTab === "overview" && (
                <>
                <section className="card catalogue">
                  <CardHeading title="Resource usage" text="How much of each plan limit this tenant has used so far." />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                      gap: 14,
                      padding: "0 24px 20px",
                    }}
                  >
                    {tenant.resourceUsage.map((item) => {
                      const Icon = RESOURCE_USAGE_ICONS[item.key] ?? Package;
                      return (
                        <div
                          key={item.key}
                          style={{ padding: 14, borderRadius: 10, border: "1px solid var(--border)" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              color: "var(--muted)",
                              fontSize: 11.5,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            <Icon size={14} /> {item.label}
                          </div>
                          <h2 style={{ margin: "6px 0 0", fontSize: 22 }}>
                            {item.used}
                            <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
                              /{fmtLimit(item.max)}
                            </span>
                          </h2>
                          <UsageBar used={item.used} max={item.max} />
                        </div>
                      );
                    })}
                  </div>
                  <p
                    className="table-subtext"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 24px 20px", margin: 0 }}
                  >
                    <Info size={13} /> Not tracked yet: {NOT_YET_TRACKED.join(", ")} — these features don't persist
                    data in the backend yet, so there's nothing to count.
                  </p>
                </section>
                <section className="card catalogue">
                  <CardHeading title="Tenant details" text="Who this tenant is and how long they've been on the platform." />
                  <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                    <label>
                      <span>Tenant name</span>
                      <p>{tenant.tenantName}</p>
                    </label>
                    <label>
                      <span>Status</span>
                      <p>
                        <StatusPill on={tenant.isActive} />
                        {tenant.isAccessBlocked && (
                          <span className="pill" style={{ marginLeft: 8, background: "#ffe0db", color: "#c22d1a" }}>
                            Access blocked
                          </span>
                        )}
                      </p>
                    </label>
                    <label>
                      <span>Website / source URL</span>
                      <p>
                        {tenant.sourceUrl ? (
                          <a href={tenant.sourceUrl} target="_blank" rel="noreferrer">
                            {tenant.sourceUrl}
                          </a>
                        ) : (
                          "—"
                        )}
                      </p>
                    </label>
                    <label>
                      <span>Owner</span>
                      <p>
                        {tenant.ownerFirstName || tenant.ownerLastName
                          ? `${tenant.ownerFirstName ?? ""} ${tenant.ownerLastName ?? ""}`.trim()
                          : "—"}
                      </p>
                    </label>
                    <label>
                      <span>Owner email</span>
                      <p>{tenant.ownerEmail}</p>
                    </label>
                    <label>
                      <span>Owner username</span>
                      <p>{tenant.ownerUsername}</p>
                    </label>
                    <label>
                      <span>Tenant created</span>
                      <p>{fmtDate(tenant.createdAt)}</p>
                    </label>
                    <label>
                      <span>Tenure</span>
                      <p>{tenureText(tenant.createdAt)}</p>
                    </label>
                  </div>
                </section>
                </>
              )}

              {activeTab === "companies" && (
                <section className="card catalogue">
                  <CardHeading
                    title="Companies & branches"
                    count={`${tenant.firms.length} compan${tenant.firms.length === 1 ? "y" : "ies"} · ${totalBranches} branch${totalBranches === 1 ? "" : "es"}`}
                    text="Every company registered under this tenant, with its branches, location, and GST details."
                  />
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>COMPANY</th>
                          <th>LOCATION</th>
                          <th>GSTIN</th>
                          <th>CONTACT</th>
                          <th>STAFF</th>
                          <th>STATUS</th>
                          <th>CREATED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.firms.map((f) => {
                          const branches = f.branches ?? [];
                          const expanded = expandedFirms.has(f.firmId);
                          return (
                            <Fragment key={f.firmId}>
                              <tr>
                                <td>
                                  <button
                                    type="button"
                                    className="firm-expand-btn"
                                    onClick={() => toggleFirm(f.firmId)}
                                    aria-label={expanded ? "Collapse branches" : "Expand branches"}
                                    disabled={!branches.length}
                                  >
                                    {branches.length ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span style={{ width: 14, display: "inline-block" }} />}
                                  </button>
                                  <strong>{f.firmName}</strong>
                                  {branches.length > 0 && (
                                    <span className="table-subtext">
                                      {branches.length} branch{branches.length === 1 ? "" : "es"}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <MapPin size={13} style={{ verticalAlign: -2, marginRight: 4, opacity: 0.6 }} />
                                  {cityState(f.city, f.state)}
                                </td>
                                <td>{f.gstNumber ?? "—"}</td>
                                <td>
                                  {f.contactNumber ?? "—"}
                                  {f.email && <span className="table-subtext">{f.email}</span>}
                                </td>
                                <td>
                                  {f.employeesUsed}/{fmtLimit(f.maxEmployees)}
                                </td>
                                <td>
                                  <StatusPill on={f.isActive} />
                                </td>
                                <td>{fmtDate(f.createdAt)}</td>
                              </tr>
                              {expanded && branches.length > 0 && (
                                <tr className="sub-table-row">
                                  <td colSpan={7}>
                                    <div className="sub-table-wrap">
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>BRANCH</th>
                                            <th>LOCATION</th>
                                            <th>CONTACT</th>
                                            <th>STATUS</th>
                                            <th>CREATED</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {branches.map((b) => (
                                            <tr key={b.branchId}>
                                              <td>{b.branchName}</td>
                                              <td>{cityState(b.city, b.state)}</td>
                                              <td>{b.contactNumber ?? "—"}</td>
                                              <td>
                                                <StatusPill on={b.isActive} />
                                              </td>
                                              <td>{fmtDate(b.createdAt)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    {!tenant.firms.length && (
                      <EmptyState
                        icon={<Users size={28} />}
                        title="No companies yet"
                        text="This tenant hasn't created any companies."
                      />
                    )}
                  </div>
                </section>
              )}

              {activeTab === "payment" && (
                <>
                  <section className="card catalogue">
                    <CardHeading
                      title="Current subscription"
                      text="Live payment status, plan, and Razorpay link for this tenant."
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
                        <span>Subscription plan</span>
                        <p>{tenant.subscriptionPackage}</p>
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
                    <CardHeading title="Plan limits" text="Firm, staff, and catalog caps for this tenant's plan.">
                      <button type="button" className="button" disabled={resyncing} onClick={resyncLimits}>
                        <RefreshCcw size={15} /> {resyncing ? "Resyncing…" : "Resync from plan"}
                      </button>
                    </CardHeading>
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
                        <span>Max companies</span>
                        <p>{fmtLimit(tenant.maxFirms)}</p>
                      </label>
                      <label>
                        <span>Max staff / company</span>
                        <p>{fmtLimit(tenant.maxStaffPerFirm)}</p>
                      </label>
                      <label>
                        <span>Max staff total</span>
                        <p>{fmtLimit(tenant.maxStaffTotal)}</p>
                      </label>
                      <label>
                        <span>Max products</span>
                        <p>{fmtLimit(tenant.maxProducts)}</p>
                      </label>
                      <label>
                        <span>Max categories</span>
                        <p>{fmtLimit(tenant.maxCategories)}</p>
                      </label>
                      <label>
                        <span>Max category mappings</span>
                        <p>{fmtLimit(tenant.maxCategoryMappings)}</p>
                      </label>
                      <label>
                        <span>Max transport firms</span>
                        <p>{fmtLimit(tenant.maxTransportFirms)}</p>
                      </label>
                      <label>
                        <span>Max attributes</span>
                        <p>{fmtLimit(tenant.maxAttributes)}</p>
                      </label>
                      {RESOURCE_LIMIT_FIELDS.map(({ key, label }) => (
                        <label key={key}>
                          <span>{label}</span>
                          <p>{fmtLimit(tenant.resourceLimits?.[key] ?? null)}</p>
                        </label>
                      ))}
                      <label>
                        <span>Subscription renewal</span>
                        <p>
                          <CalendarClock size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
                          {fmtShortDate(tenant.subscriptionExpiresAt)}
                          {tenant.subscriptionExpiresAt && (
                            <span className={tenant.isAccessBlocked ? "low" : "text-muted"} style={{ marginLeft: 8 }}>
                              ({expiryText(tenant.subscriptionExpiresAt, tenant.isAccessBlocked)})
                            </span>
                          )}
                        </p>
                      </label>
                    </div>
                  </section>

                  <section className="card catalogue">
                    <CardHeading
                      title="Payment history"
                      count={`${tenant.paymentHistory.length} record${tenant.paymentHistory.length === 1 ? "" : "s"}`}
                      text="Every subscription payment event for this tenant — links created, paid, failed, or cancelled."
                    />
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>DATE</th>
                            <th>PLAN</th>
                            <th>AMOUNT</th>
                            <th>STATUS</th>
                            <th>RAZORPAY PAYMENT ID</th>
                            <th>SUBSCRIPTION VALID TILL</th>
                            <th>NOTE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tenant.paymentHistory.map((p) => (
                            <tr key={p.paymentHistoryId}>
                              <td>{fmtDate(p.createdAt)}</td>
                              <td>{p.subscriptionPackage}</td>
                              <td>{fmtMoney(p.amount)}</td>
                              <td>
                                <span className={`usage-pill usage-${PAYMENT_TONE[p.status]}`}>{p.status}</span>
                              </td>
                              <td>{p.razorpayPaymentId ?? "—"}</td>
                              <td>{fmtDate(p.subscriptionExpiresAt)}</td>
                              <td className="table-subtext" style={{ display: "table-cell" }}>
                                {p.note ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!tenant.paymentHistory.length && (
                        <EmptyState
                          icon={<CreditCard size={28} />}
                          title="No payment history yet"
                          text="No payment events have been recorded for this tenant."
                        />
                      )}
                    </div>
                  </section>
                </>
              )}

              {activeTab === "owner" && (
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
              )}

              {activeTab === "danger" && (
                <section className="card catalogue">
                  <CardHeading
                    title="Danger zone"
                    text="Deleting removes this tenant and its companies/branches from the platform. Their owner can no longer sign in."
                  >
                    <button
                      type="button"
                      className="button danger"
                      disabled={deleting}
                      onClick={() => setConfirmDeleteOpen(true)}
                    >
                      <Trash2 size={15} /> {deleting ? "Deleting…" : "Delete tenant"}
                    </button>
                  </CardHeading>
                </section>
              )}
            </>
          )}
        </main>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this tenant?"
        description={
          tenant
            ? `"${tenant.tenantName}" and its ${tenant.firms.length} compan${tenant.firms.length === 1 ? "y" : "ies"} will be removed. The owner and staff will lose access immediately. This cannot be undone from the UI.`
            : ""
        }
        confirmLabel="Delete tenant"
        danger
        onConfirm={deleteTenant}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
      <Toast message={toast} onDismiss={dismissToast} />
    </>
  );
}
