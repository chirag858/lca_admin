"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  LogOut,
  Plus,
  ShieldCheck,
  Users,
  RefreshCcw,
  Pencil,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { StatusPill } from "./ui/status-pill";
import { Modal } from "./ui/modal";
import { DialogActions } from "./ui/dialog-actions";
import { Select } from "./select";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";

type SubscriptionPackage = {
  code: string;
  displayName: string;
  defaultMaxFirms: number | null;
  defaultMaxStaffPerFirm: number | null;
  defaultMaxStaffTotal: number | null;
  monthlyPrice: number;
};

type PaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";

type TenantUsage = {
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
  ownerUsername: string;
  ownerEmail: string;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  paymentStatus: PaymentStatus;
  paymentAmount: number | null;
  paymentLinkUrl: string | null;
  subscriptionExpiresAt: string | null;
  isAccessBlocked: boolean;
};

function fmtLimit(value: number | null) {
  return value === null || value >= 2147483647 ? "∞" : String(value);
}

function usageRatio(used: number, max: number | null) {
  if (max === null || max === 0) return 0;
  return used / max;
}

function UsagePill({ used, max }: { used: number; max: number | null }) {
  const ratio = usageRatio(used, max);
  const tone = max !== null && used >= max ? "red" : ratio >= 0.8 ? "amber" : "green";
  return (
    <span className={`usage-pill usage-${tone}`}>
      {used}/{fmtLimit(max)}
    </span>
  );
}

const PAYMENT_TONE: Record<PaymentStatus, "green" | "amber" | "red"> = {
  Paid: "green",
  Pending: "amber",
  Failed: "red",
  Cancelled: "red",
};

function PaymentStatusPill({ status, isAccessBlocked }: { status: PaymentStatus; isAccessBlocked: boolean }) {
  const expired = status === "Paid" && isAccessBlocked;
  return (
    <span className={`usage-pill usage-${expired ? "red" : PAYMENT_TONE[status]}`}>
      {expired ? "Expired" : status}
    </span>
  );
}

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TenantUsage | null>(null);
  const { toast, show: notify, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [tenantsData, packagesData] = await Promise.all([
          fetchJson<TenantUsage[]>(
            "/api/tenants",
            { signal: controller.signal },
            "Unable to load tenants.",
          ),
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
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const [resendingId, setResendingId] = useState<number | null>(null);

  async function resendPaymentLink(tenant: TenantUsage) {
    setResendingId(tenant.tenantId);
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
      setResendingId(null);
    }
  }

  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  async function markPaid(tenant: TenantUsage) {
    if (!window.confirm(`Mark "${tenant.tenantName}" as paid for a fresh 1-month cycle? Use this only for grandfathering or an offline payment — it does not touch Razorpay.`))
      return;
    setMarkingPaidId(tenant.tenantId);
    try {
      await fetchJson(
        `/api/tenants/${tenant.tenantId}/mark-paid`,
        { method: "POST" },
        "Unable to mark tenant as paid.",
      );
      notify(`"${tenant.tenantName}" marked Paid for the next month.`);
      setRetry((n) => n + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Unable to mark tenant as paid.");
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const totals = useMemo(
    () => ({
      tenants: tenants.length,
      firms: tenants.reduce((sum, t) => sum + t.firmsUsed, 0),
      staff: tenants.reduce((sum, t) => sum + t.staffUsed, 0),
      atLimit: tenants.filter(
        (t) =>
          (t.maxFirms !== null && t.firmsUsed >= t.maxFirms) ||
          (t.maxStaffTotal !== null && t.staffUsed >= t.maxStaffTotal),
      ).length,
    }),
    [tenants],
  );

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
            title="Tenants & Subscriptions"
            description="Create tenants, assign subscription plans, and manage firm/staff limits."
            actions={
              <button type="button" className="primary" onClick={() => setCreating(true)}>
                <Plus size={17} /> Add tenant
              </button>
            }
          />

          <section className="stats">
            {[
              { label: "Tenants", value: totals.tenants, icon: ShieldCheck, color: "purple" },
              { label: "Firms provisioned", value: totals.firms, icon: Building2, color: "blue" },
              { label: "Staff provisioned", value: totals.staff, icon: Users, color: "green" },
              { label: "At/near limit", value: totals.atLimit, icon: RefreshCcw, color: "orange" },
            ].map(({ label, value, icon: Icon, color }) => (
              <article className="card stat" key={label}>
                <div>
                  <span>{label}</span>
                  <h2>{loading ? "—" : String(value).padStart(2, "0")}</h2>
                </div>
                <span className={"icon-tile " + color}>
                  <Icon size={23} />
                </span>
              </article>
            ))}
          </section>

          <section className="card catalogue">
            <CardHeading title="Tenants" count={`${tenants.length} tenants`} text="Every onboarded tenant and its current plan." />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TENANT</th>
                    <th>PLAN</th>
                    <th>FIRMS</th>
                    <th>STAFF</th>
                    <th>STATUS</th>
                    <th>PAYMENT</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.tenantId}>
                      <td>
                        <Link href={`/tenants/${t.tenantId}`} className="link-strong">
                          <strong>{t.tenantName}</strong>
                        </Link>
                      </td>
                      <td>
                        {t.subscriptionPackage}
                        {t.isCustomOverride && <span className="pill" style={{ marginLeft: 6 }}>Custom override</span>}
                      </td>
                      <td>
                        <UsagePill used={t.firmsUsed} max={t.maxFirms} />
                      </td>
                      <td>
                        <UsagePill used={t.staffUsed} max={t.maxStaffTotal} />
                      </td>
                      <td>
                        <StatusPill on={t.isActive} />
                      </td>
                      <td>
                        <PaymentStatusPill status={t.paymentStatus} isAccessBlocked={t.isAccessBlocked} />
                        {t.paymentAmount !== null && (
                          <div className="low" style={{ marginTop: 2 }}>
                            ₹{t.paymentAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        {t.subscriptionExpiresAt && (
                          <div className="low" style={{ marginTop: 2 }}>
                            {t.isAccessBlocked ? "Expired " : "Renews "}
                            {fmtDate(t.subscriptionExpiresAt)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {t.isAccessBlocked && (
                            <>
                              {t.paymentAmount !== null && (
                                <button
                                  type="button"
                                  title="Resend payment link"
                                  aria-label={"Resend payment link for " + t.tenantName}
                                  disabled={resendingId === t.tenantId}
                                  onClick={() => resendPaymentLink(t)}
                                >
                                  <RefreshCcw size={15} />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Mark as paid"
                                aria-label={"Mark " + t.tenantName + " as paid"}
                                disabled={markingPaidId === t.tenantId}
                                onClick={() => markPaid(t)}
                              >
                                <CreditCard size={15} />
                              </button>
                            </>
                          )}
                          <button type="button" title="Edit limits" aria-label={"Edit limits for " + t.tenantName} onClick={() => setEditing(t)}>
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tenants.length && (
                <EmptyState
                  icon={<Building2 size={28} />}
                  title={loading ? "Loading tenants…" : error ? "Unable to load tenants" : "No tenants yet"}
                  text={<span role={error ? "alert" : "status"}>{error || "Create your first tenant to get started."}</span>}
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
      <CreateTenantModal
        open={creating}
        packages={packages}
        onClose={() => setCreating(false)}
        onCreated={(name, warning, emailSent) => {
          setCreating(false);
          if (warning) notify(`Tenant "${name}" was created, but: ${warning}`);
          else notify(`Tenant "${name}" was created${emailSent ? " and a welcome email was sent." : "."}`);
          setRetry((n) => n + 1);
        }}
      />
      <EditLimitsModal
        tenant={editing}
        packages={packages}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          notify("Tenant limits were updated.");
          setRetry((n) => n + 1);
        }}
      />
    </>
  );
}

type LimitFieldErrors = Partial<Record<"tenantName" | "ownerUsername" | "ownerEmail" | "ownerPassword" | "maxFirms" | "maxStaffPerFirm" | "maxStaffTotal", string>>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

function limitsFromPackage(pkg: SubscriptionPackage | undefined) {
  return {
    maxFirms: pkg?.defaultMaxFirms === null || pkg?.defaultMaxFirms === undefined ? "" : String(pkg.defaultMaxFirms),
    maxStaffPerFirm: pkg?.defaultMaxStaffPerFirm === null || pkg?.defaultMaxStaffPerFirm === undefined ? "" : String(pkg.defaultMaxStaffPerFirm),
    maxStaffTotal: pkg?.defaultMaxStaffTotal === null || pkg?.defaultMaxStaffTotal === undefined ? "" : String(pkg.defaultMaxStaffTotal),
  };
}

function isOverridden(pkg: SubscriptionPackage | undefined, field: "maxFirms" | "maxStaffPerFirm" | "maxStaffTotal", value: string) {
  if (!pkg) return false;
  const defaultValue = field === "maxFirms" ? pkg.defaultMaxFirms : field === "maxStaffPerFirm" ? pkg.defaultMaxStaffPerFirm : pkg.defaultMaxStaffTotal;
  const defaultText = defaultValue === null || defaultValue === undefined ? "" : String(defaultValue);
  return value !== defaultText;
}

function CreateTenantModal({
  open,
  packages,
  onClose,
  onCreated,
}: {
  open: boolean;
  packages: SubscriptionPackage[];
  onClose: () => void;
  onCreated: (tenantName: string, warning: string | null, emailSent: boolean) => void;
}) {
  const [tenantName, setTenantName] = useState("");
  const [subscriptionPackage, setSubscriptionPackage] = useState("");
  const [maxFirms, setMaxFirms] = useState("");
  const [maxStaffPerFirm, setMaxStaffPerFirm] = useState("");
  const [maxStaffTotal, setMaxStaffTotal] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LimitFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPackage = packages.find((p) => p.code === subscriptionPackage);

  function reset() {
    setTenantName("");
    setSubscriptionPackage("");
    setMaxFirms("");
    setMaxStaffPerFirm("");
    setMaxStaffTotal("");
    setOwnerUsername("");
    setOwnerEmail("");
    setOwnerPassword("");
    setShowPassword(false);
    setOwnerFirstName("");
    setOwnerLastName("");
    setPaymentAmount("");
    setFieldErrors({});
    setError("");
  }

  function close() {
    reset();
    onClose();
  }

  function pickPackage(code: string) {
    setSubscriptionPackage(code);
    if (code === "Custom") {
      setMaxFirms("");
      setMaxStaffPerFirm("");
      setMaxStaffTotal("");
      return;
    }
    const pkg = packages.find((p) => p.code === code);
    const defaults = limitsFromPackage(pkg);
    setMaxFirms(defaults.maxFirms);
    setMaxStaffPerFirm(defaults.maxStaffPerFirm);
    setMaxStaffTotal(defaults.maxStaffTotal);
    setPaymentAmount(pkg ? String(pkg.monthlyPrice) : "");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: LimitFieldErrors = {};
    if (!tenantName.trim()) errors.tenantName = "Tenant name is required.";
    if (!ownerUsername.trim()) errors.ownerUsername = "Owner username is required.";
    if (!ownerEmail.trim()) errors.ownerEmail = "Owner email is required.";
    if (!ownerPassword) errors.ownerPassword = "Owner password is required.";
    if (subscriptionPackage === "Custom") {
      if (!maxFirms.trim()) errors.maxFirms = "Required for Custom plans.";
      if (!maxStaffPerFirm.trim()) errors.maxStaffPerFirm = "Required for Custom plans.";
      if (!maxStaffTotal.trim()) errors.maxStaffTotal = "Required for Custom plans.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError("");
    try {
      const created = await fetchJson<{ tenantName: string; paymentLinkUrl: string | null; emailSent: boolean; warning: string | null }>(
        "/api/tenants",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantName: tenantName.trim(),
            subscriptionPackage,
            maxFirms: maxFirms.trim() === "" ? null : Number(maxFirms),
            maxStaffPerFirm: maxStaffPerFirm.trim() === "" ? null : Number(maxStaffPerFirm),
            maxStaffTotal: maxStaffTotal.trim() === "" ? null : Number(maxStaffTotal),
            ownerUsername: ownerUsername.trim(),
            ownerEmail: ownerEmail.trim(),
            ownerPassword,
            ownerFirstName: ownerFirstName.trim(),
            ownerLastName: ownerLastName.trim(),
            paymentAmount: paymentAmount.trim() === "" ? null : Number(paymentAmount),
          }),
        },
        "Unable to create tenant.",
      );
      onCreated(created.tenantName, created.warning, created.emailSent);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} titleId="create-tenant-title" title="Add tenant" className="dialog-wide">
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>
            <span>Tenant name <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={200}
              autoComplete="off"
              value={tenantName}
              aria-invalid={!!fieldErrors.tenantName}
              onChange={(e) => {
                setTenantName(e.target.value);
                setFieldErrors((p) => ({ ...p, tenantName: undefined }));
              }}
            />
            <FieldError message={fieldErrors.tenantName} />
          </label>
          <label>
            <span>Subscription package <span className="required-marker" aria-hidden="true">*</span></span>
            <Select
              ariaLabel="Subscription package"
              placeholder="Select package"
              value={subscriptionPackage}
              onChange={pickPackage}
              options={packages.map((p) => ({ value: p.code, label: p.displayName }))}
            />
          </label>
        </div>

        {subscriptionPackage && (
          <div className="form-grid">
            <label>
              <span>Max firms</span>
              <input
                type="number"
                min={0}
                value={maxFirms}
                aria-invalid={!!fieldErrors.maxFirms}
                onChange={(e) => setMaxFirms(e.target.value)}
              />
              {isOverridden(selectedPackage, "maxFirms", maxFirms) && <small className="pill">Custom override</small>}
              <FieldError message={fieldErrors.maxFirms} />
            </label>
            <label>
              <span>Max staff per firm</span>
              <input
                type="number"
                min={0}
                value={maxStaffPerFirm}
                aria-invalid={!!fieldErrors.maxStaffPerFirm}
                onChange={(e) => setMaxStaffPerFirm(e.target.value)}
              />
              {isOverridden(selectedPackage, "maxStaffPerFirm", maxStaffPerFirm) && <small className="pill">Custom override</small>}
              <FieldError message={fieldErrors.maxStaffPerFirm} />
            </label>
            <label>
              <span>Max staff total</span>
              <input
                type="number"
                min={0}
                value={maxStaffTotal}
                aria-invalid={!!fieldErrors.maxStaffTotal}
                onChange={(e) => setMaxStaffTotal(e.target.value)}
              />
              {isOverridden(selectedPackage, "maxStaffTotal", maxStaffTotal) && <small className="pill">Custom override</small>}
              <FieldError message={fieldErrors.maxStaffTotal} />
            </label>
          </div>
        )}

        {subscriptionPackage && (
          <p role="status" className="low">
            This tenant can create up to <strong>{maxFirms || "∞"}</strong> firms, each with up to{" "}
            <strong>{maxStaffPerFirm || "∞"}</strong> staff, and <strong>{maxStaffTotal || "∞"}</strong> staff in total.
          </p>
        )}

        {subscriptionPackage && (
          <div className="form-grid">
            <label>
              <span>Payment amount (₹)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </label>
          </div>
        )}
        {subscriptionPackage && Number(paymentAmount) > 0 && (
          <p className="low">
            A Razorpay payment link for ₹{paymentAmount} will be emailed to the owner along with their login credentials.
          </p>
        )}
        {subscriptionPackage && Number(paymentAmount) === 0 && (
          <p className="low">No payment link will be created (amount is ₹0) — only the welcome email with login credentials is sent.</p>
        )}

        <div className="form-grid">
          <label>
            <span>Owner username <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={100}
              autoComplete="off"
              value={ownerUsername}
              aria-invalid={!!fieldErrors.ownerUsername}
              onChange={(e) => {
                setOwnerUsername(e.target.value);
                setFieldErrors((p) => ({ ...p, ownerUsername: undefined }));
              }}
            />
            <FieldError message={fieldErrors.ownerUsername} />
          </label>
          <label>
            <span>Owner email <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              type="email"
              maxLength={256}
              autoComplete="off"
              value={ownerEmail}
              aria-invalid={!!fieldErrors.ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setFieldErrors((p) => ({ ...p, ownerEmail: undefined }));
              }}
            />
            <FieldError message={fieldErrors.ownerEmail} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Owner first name</span>
            <input autoComplete="off" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} />
          </label>
          <label>
            <span>Owner last name</span>
            <input autoComplete="off" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Password <span className="required-marker" aria-hidden="true">*</span></span>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                maxLength={1024}
                autoComplete="new-password"
                value={ownerPassword}
                aria-invalid={!!fieldErrors.ownerPassword}
                onChange={(e) => {
                  setOwnerPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, ownerPassword: undefined }));
                }}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <FieldError message={fieldErrors.ownerPassword} />
          </label>
        </div>
        {!!error && (
          <p className="low" role="alert">
            {error}
          </p>
        )}
        <DialogActions onCancel={close} submitLabel={saving ? "Creating…" : "Create tenant"} disabled={saving} />
      </form>
    </Modal>
  );
}

type EditTenantFieldErrors = Partial<Record<"tenantName" | "ownerUsername" | "ownerEmail" | "newOwnerPassword", string>>;

function EditLimitsModal({
  tenant,
  packages,
  onClose,
  onSaved,
}: {
  tenant: TenantUsage | null;
  packages: SubscriptionPackage[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tenantName, setTenantName] = useState("");
  const [tenantActive, setTenantActive] = useState(true);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EditTenantFieldErrors>({});

  const [subscriptionPackage, setSubscriptionPackage] = useState("");
  const [maxFirms, setMaxFirms] = useState("");
  const [maxStaffPerFirm, setMaxStaffPerFirm] = useState("");
  const [maxStaffTotal, setMaxStaffTotal] = useState("");
  const [allowOverLimit, setAllowOverLimit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tenant) return;
    setTenantName(tenant.tenantName);
    setTenantActive(tenant.isActive);
    setOwnerUsername(tenant.ownerUsername);
    setOwnerEmail(tenant.ownerEmail);
    setOwnerFirstName(tenant.ownerFirstName ?? "");
    setOwnerLastName(tenant.ownerLastName ?? "");
    setNewOwnerPassword("");
    setShowPassword(false);
    setFieldErrors({});
    setSubscriptionPackage(tenant.subscriptionPackage);
    setMaxFirms(tenant.maxFirms === null ? "" : String(tenant.maxFirms));
    setMaxStaffPerFirm(tenant.maxStaffPerFirm === null ? "" : String(tenant.maxStaffPerFirm));
    setMaxStaffTotal(tenant.maxStaffTotal === null ? "" : String(tenant.maxStaffTotal));
    setAllowOverLimit(false);
    setError("");
  }, [tenant]);

  if (!tenant) return null;
  const activeTenant = tenant;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: EditTenantFieldErrors = {};
    if (!tenantName.trim()) errors.tenantName = "Tenant name is required.";
    if (!ownerUsername.trim()) errors.ownerUsername = "Owner username is required.";
    if (!ownerEmail.trim()) errors.ownerEmail = "Owner email is required.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError("");
    try {
      await fetchJson(
        `/api/tenants/${activeTenant.tenantId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantName: tenantName.trim(),
            ownerUsername: ownerUsername.trim(),
            ownerEmail: ownerEmail.trim(),
            ownerFirstName: ownerFirstName.trim(),
            ownerLastName: ownerLastName.trim(),
            newOwnerPassword: newOwnerPassword || null,
            isActive: tenantActive,
          }),
        },
        "Unable to update tenant details.",
      );
      await fetchJson(
        `/api/tenants/${activeTenant.tenantId}/limits`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionPackage,
            maxFirms: maxFirms.trim() === "" ? null : Number(maxFirms),
            maxStaffPerFirm: maxStaffPerFirm.trim() === "" ? null : Number(maxStaffPerFirm),
            maxStaffTotal: maxStaffTotal.trim() === "" ? null : Number(maxStaffTotal),
            allowOverLimit,
          }),
        },
        "Unable to update tenant limits.",
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!tenant} onClose={onClose} titleId="edit-tenant-title" title={`Edit tenant — ${tenant.tenantName}`} className="dialog-wide">
      <form onSubmit={submit} noValidate>
        <p className="low">
          Current usage: <strong>{tenant.firmsUsed}</strong> firms, <strong>{tenant.staffUsed}</strong> staff.
        </p>

        <div className="form-grid">
          <label>
            <span>Tenant name <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={200}
              autoComplete="off"
              value={tenantName}
              aria-invalid={!!fieldErrors.tenantName}
              onChange={(e) => {
                setTenantName(e.target.value);
                setFieldErrors((p) => ({ ...p, tenantName: undefined }));
              }}
            />
            <FieldError message={fieldErrors.tenantName} />
          </label>
          <label className="checkbox-label" style={{ alignSelf: "end", marginBottom: 2 }}>
            <input className="checkbox" type="checkbox" checked={tenantActive} onChange={(e) => setTenantActive(e.target.checked)} />{" "}
            Tenant active
          </label>
        </div>

        <div className="form-grid">
          <label>
            <span>Owner username <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={100}
              autoComplete="off"
              value={ownerUsername}
              aria-invalid={!!fieldErrors.ownerUsername}
              onChange={(e) => {
                setOwnerUsername(e.target.value);
                setFieldErrors((p) => ({ ...p, ownerUsername: undefined }));
              }}
            />
            <FieldError message={fieldErrors.ownerUsername} />
          </label>
          <label>
            <span>Owner email <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              type="email"
              maxLength={256}
              autoComplete="off"
              value={ownerEmail}
              aria-invalid={!!fieldErrors.ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setFieldErrors((p) => ({ ...p, ownerEmail: undefined }));
              }}
            />
            <FieldError message={fieldErrors.ownerEmail} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Owner first name</span>
            <input autoComplete="off" value={ownerFirstName} onChange={(e) => setOwnerFirstName(e.target.value)} />
          </label>
          <label>
            <span>Owner last name</span>
            <input autoComplete="off" value={ownerLastName} onChange={(e) => setOwnerLastName(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Reset owner password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                maxLength={1024}
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
                value={newOwnerPassword}
                onChange={(e) => setNewOwnerPassword(e.target.value)}
              />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
        </div>

        <div className="form-grid">
          <label>
            <span>Subscription package</span>
            <Select
              ariaLabel="Subscription package"
              value={subscriptionPackage}
              onChange={setSubscriptionPackage}
              options={packages.map((p) => ({ value: p.code, label: p.displayName }))}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Max firms</span>
            <input type="number" min={0} value={maxFirms} onChange={(e) => setMaxFirms(e.target.value)} />
          </label>
          <label>
            <span>Max staff per firm</span>
            <input type="number" min={0} value={maxStaffPerFirm} onChange={(e) => setMaxStaffPerFirm(e.target.value)} />
          </label>
          <label>
            <span>Max staff total</span>
            <input type="number" min={0} value={maxStaffTotal} onChange={(e) => setMaxStaffTotal(e.target.value)} />
          </label>
        </div>
        <label className="checkbox-label">
          <input
            className="checkbox"
            type="checkbox"
            checked={allowOverLimit}
            onChange={(e) => setAllowOverLimit(e.target.checked)}
          />{" "}
          Allow over-limit (grace period) — force downgrade even if current usage exceeds the new limits
        </label>
        {!!error && (
          <p className="low" role="alert">
            {error}
          </p>
        )}
        <DialogActions onCancel={onClose} submitLabel={saving ? "Saving…" : "Save changes"} disabled={saving} />
      </form>
    </Modal>
  );
}
