"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, LogOut, Plus, Pencil, RefreshCcw } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { StatusPill } from "./ui/status-pill";
import { Modal } from "./ui/modal";
import { DialogActions } from "./ui/dialog-actions";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";

type Package = {
  code: string;
  displayName: string;
  defaultMaxFirms: number | null;
  defaultMaxStaffPerFirm: number | null;
  defaultMaxStaffTotal: number | null;
  isActive: boolean;
  sortOrder: number;
};

function fmtLimit(value: number | null) {
  return value === null || value >= 2147483647 ? "Unlimited" : String(value);
}

export default function AdminPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const { toast, show: notify, dismiss: dismissToast } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<Package[]>(
          "/api/subscription-packages/all",
          { signal: controller.signal },
          "Unable to load subscription packages.",
        );
        if (!controller.signal.aborted) setPackages(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load subscription packages.");
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
            title="Subscription Packages"
            description="Manage the default firm/staff limits tenants get when onboarded onto each plan."
            actions={
              <button type="button" className="primary" onClick={() => setCreating(true)}>
                <Plus size={17} /> Add package
              </button>
            }
          />

          <section className="card catalogue">
            <CardHeading
              title="Packages"
              count={`${packages.length} packages`}
              text="Active packages appear in the Add Tenant dropdown; retired ones stay here for existing tenants."
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>CODE</th>
                    <th>DISPLAY NAME</th>
                    <th>MAX FIRMS</th>
                    <th>MAX STAFF / FIRM</th>
                    <th>MAX STAFF TOTAL</th>
                    <th>STATUS</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {packages.map((p) => (
                    <tr key={p.code}>
                      <td>
                        <strong>{p.code}</strong>
                      </td>
                      <td>{p.displayName}</td>
                      <td>{fmtLimit(p.defaultMaxFirms)}</td>
                      <td>{fmtLimit(p.defaultMaxStaffPerFirm)}</td>
                      <td>{fmtLimit(p.defaultMaxStaffTotal)}</td>
                      <td>
                        <StatusPill on={p.isActive} onLabel="Active" offLabel="Retired" />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" title="Edit package" aria-label={"Edit " + p.displayName} onClick={() => setEditing(p)}>
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!packages.length && (
                <EmptyState
                  icon={<Layers size={28} />}
                  title={loading ? "Loading packages…" : error ? "Unable to load packages" : "No packages yet"}
                  text={<span role={error ? "alert" : "status"}>{error || "Add your first subscription package."}</span>}
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
      <CreatePackageModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(name) => {
          setCreating(false);
          notify(`Package "${name}" was created.`);
          setRetry((n) => n + 1);
        }}
      />
      <EditPackageModal
        pkg={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          notify("Package was updated.");
          setRetry((n) => n + 1);
        }}
      />
    </>
  );
}

type FieldErrors = Partial<Record<"code" | "displayName" | "defaultMaxFirms" | "defaultMaxStaffPerFirm" | "defaultMaxStaffTotal", string>>;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}

const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{1,29}$/;

function CreatePackageModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (displayName: string) => void;
}) {
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultMaxFirms, setDefaultMaxFirms] = useState("");
  const [defaultMaxStaffPerFirm, setDefaultMaxStaffPerFirm] = useState("");
  const [defaultMaxStaffTotal, setDefaultMaxStaffTotal] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setCode("");
    setDisplayName("");
    setDefaultMaxFirms("");
    setDefaultMaxStaffPerFirm("");
    setDefaultMaxStaffTotal("");
    setSortOrder("0");
    setFieldErrors({});
    setError("");
  }

  function close() {
    reset();
    onClose();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errors: FieldErrors = {};
    if (!CODE_PATTERN.test(code.trim()))
      errors.code = "Start with a letter; letters, numbers, - or _ only (2–30 characters).";
    if (!displayName.trim()) errors.displayName = "Display name is required.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError("");
    try {
      const created = await fetchJson<{ displayName: string }>(
        "/api/subscription-packages",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: code.trim(),
            displayName: displayName.trim(),
            defaultMaxFirms: defaultMaxFirms.trim() === "" ? null : Number(defaultMaxFirms),
            defaultMaxStaffPerFirm: defaultMaxStaffPerFirm.trim() === "" ? null : Number(defaultMaxStaffPerFirm),
            defaultMaxStaffTotal: defaultMaxStaffTotal.trim() === "" ? null : Number(defaultMaxStaffTotal),
            sortOrder: Number(sortOrder) || 0,
          }),
        },
        "Unable to create package.",
      );
      onCreated(created.displayName);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create package.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} titleId="create-package-title" title="Add subscription package" className="dialog-wide">
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>
            <span>Code <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={30}
              placeholder="e.g. Growth"
              value={code}
              aria-invalid={!!fieldErrors.code}
              onChange={(e) => {
                setCode(e.target.value);
                setFieldErrors((p) => ({ ...p, code: undefined }));
              }}
            />
            <FieldError message={fieldErrors.code} />
          </label>
          <label>
            <span>Display name <span className="required-marker" aria-hidden="true">*</span></span>
            <input
              maxLength={100}
              value={displayName}
              aria-invalid={!!fieldErrors.displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setFieldErrors((p) => ({ ...p, displayName: undefined }));
              }}
            />
            <FieldError message={fieldErrors.displayName} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Max firms</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxFirms} onChange={(e) => setDefaultMaxFirms(e.target.value)} />
          </label>
          <label>
            <span>Max staff per firm</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxStaffPerFirm} onChange={(e) => setDefaultMaxStaffPerFirm(e.target.value)} />
          </label>
          <label>
            <span>Max staff total</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxStaffTotal} onChange={(e) => setDefaultMaxStaffTotal(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Sort order</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        </div>
        {!!error && (
          <p className="low" role="alert">
            {error}
          </p>
        )}
        <DialogActions onCancel={close} submitLabel={saving ? "Creating…" : "Create package"} disabled={saving} />
      </form>
    </Modal>
  );
}

function EditPackageModal({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: Package | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [defaultMaxFirms, setDefaultMaxFirms] = useState("");
  const [defaultMaxStaffPerFirm, setDefaultMaxStaffPerFirm] = useState("");
  const [defaultMaxStaffTotal, setDefaultMaxStaffTotal] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pkg) return;
    setDisplayName(pkg.displayName);
    setDefaultMaxFirms(pkg.defaultMaxFirms === null ? "" : String(pkg.defaultMaxFirms));
    setDefaultMaxStaffPerFirm(pkg.defaultMaxStaffPerFirm === null ? "" : String(pkg.defaultMaxStaffPerFirm));
    setDefaultMaxStaffTotal(pkg.defaultMaxStaffTotal === null ? "" : String(pkg.defaultMaxStaffTotal));
    setSortOrder(String(pkg.sortOrder));
    setIsActive(pkg.isActive);
    setError("");
  }, [pkg]);

  if (!pkg) return null;
  const activePkg = pkg;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await fetchJson(
        `/api/subscription-packages/${encodeURIComponent(activePkg.code)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            defaultMaxFirms: defaultMaxFirms.trim() === "" ? null : Number(defaultMaxFirms),
            defaultMaxStaffPerFirm: defaultMaxStaffPerFirm.trim() === "" ? null : Number(defaultMaxStaffPerFirm),
            defaultMaxStaffTotal: defaultMaxStaffTotal.trim() === "" ? null : Number(defaultMaxStaffTotal),
            sortOrder: Number(sortOrder) || 0,
            isActive,
          }),
        },
        "Unable to update package.",
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update package.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!pkg} onClose={onClose} titleId="edit-package-title" title={`Edit package — ${activePkg.code}`} className="dialog-wide">
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label>
            <span>Display name</span>
            <input maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
          <label>
            <span>Sort order</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Max firms</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxFirms} onChange={(e) => setDefaultMaxFirms(e.target.value)} />
          </label>
          <label>
            <span>Max staff per firm</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxStaffPerFirm} onChange={(e) => setDefaultMaxStaffPerFirm(e.target.value)} />
          </label>
          <label>
            <span>Max staff total</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxStaffTotal} onChange={(e) => setDefaultMaxStaffTotal(e.target.value)} />
          </label>
        </div>
        <label className="checkbox-label">
          <input className="checkbox" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active (shown in the Add Tenant dropdown)
        </label>
        {!!error && (
          <p className="low" role="alert">
            {error}
          </p>
        )}
        <DialogActions onCancel={onClose} submitLabel={saving ? "Saving…" : "Save package"} disabled={saving} />
      </form>
    </Modal>
  );
}
