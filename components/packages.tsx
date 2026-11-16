"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, LogOut, Plus, Pencil, RefreshCcw } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { SkeletonRows } from "./ui/skeleton";
import { StatusPill } from "./ui/status-pill";
import { Modal } from "./ui/modal";
import { DialogActions } from "./ui/dialog-actions";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";
import { SearchInput } from "./ui/search-input";
import { Select } from "./select";
import { Pagination } from "./ui/pagination";

const PAGE_SIZE = 10;

type Package = {
  code: string;
  displayName: string;
  defaultMaxFirms: number | null;
  defaultMaxStaffPerFirm: number | null;
  defaultMaxStaffTotal: number | null;
  defaultMaxProducts: number | null;
  defaultMaxCategories: number | null;
  defaultMaxCategoryMappings: number | null;
  defaultMaxTransportFirms: number | null;
  defaultMaxAttributes: number | null;
  monthlyPrice: number;
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((p) => {
      if (statusFilter === "active" && !p.isActive) return false;
      if (statusFilter === "retired" && p.isActive) return false;
      if (q && !p.code.toLowerCase().includes(q) && !p.displayName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [packages, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / PAGE_SIZE));
  const pagedPackages = filteredPackages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
              count={`${filteredPackages.length} of ${packages.length} packages`}
              text="Active packages appear in the Add Tenant dropdown; retired ones stay here for existing tenants."
            />
            <div className="filters">
              <SearchInput
                value={search}
                onChange={setSearch}
                label="Search packages"
                placeholder="Search by code or display name…"
              />
              <Select
                ariaLabel="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "retired", label: "Retired" },
                ]}
              />
            </div>
            <div className="table-scroll sticky-cols">
              <table>
                <thead>
                  <tr>
                    <th>DISPLAY NAME</th>
                    <th>MAX FIRMS</th>
                    <th>MAX STAFF / FIRM</th>
                    <th>MAX STAFF TOTAL</th>
                    <th>MAX PRODUCTS</th>
                    <th>MAX CATEGORIES</th>
                    <th>MAX CAT. MAPPINGS</th>
                    <th>MAX TRANSPORT FIRMS</th>
                    <th>MAX ATTRIBUTES</th>
                    <th>PRICE/MO</th>
                    <th>STATUS</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <SkeletonRows
                      cols={12}
                      widths={["70%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "40%", "50%", "40%", "20%"]}
                    />
                  )}
                  {!loading && pagedPackages.map((p) => (
                    <tr key={p.code}>
                      <td>{p.displayName}</td>
                      <td>{fmtLimit(p.defaultMaxFirms)}</td>
                      <td>{fmtLimit(p.defaultMaxStaffPerFirm)}</td>
                      <td>{fmtLimit(p.defaultMaxStaffTotal)}</td>
                      <td>{fmtLimit(p.defaultMaxProducts)}</td>
                      <td>{fmtLimit(p.defaultMaxCategories)}</td>
                      <td>{fmtLimit(p.defaultMaxCategoryMappings)}</td>
                      <td>{fmtLimit(p.defaultMaxTransportFirms)}</td>
                      <td>{fmtLimit(p.defaultMaxAttributes)}</td>
                      <td>₹{p.monthlyPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
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
              {!loading && !pagedPackages.length && (
                <EmptyState
                  icon={<Layers size={28} />}
                  title={
                    error
                      ? "Unable to load packages"
                        : packages.length
                          ? "No packages match your filters"
                          : "No packages yet"
                  }
                  text={
                    <span role={error ? "alert" : "status"}>
                      {error || (packages.length ? "Try a different search or status filter." : "Add your first subscription package.")}
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
            <Pagination page={page} pages={totalPages} onPageChange={setPage} />
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
  const [defaultMaxProducts, setDefaultMaxProducts] = useState("");
  const [defaultMaxCategories, setDefaultMaxCategories] = useState("");
  const [defaultMaxCategoryMappings, setDefaultMaxCategoryMappings] = useState("");
  const [defaultMaxTransportFirms, setDefaultMaxTransportFirms] = useState("");
  const [defaultMaxAttributes, setDefaultMaxAttributes] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
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
    setDefaultMaxProducts("");
    setDefaultMaxCategories("");
    setDefaultMaxCategoryMappings("");
    setDefaultMaxTransportFirms("");
    setDefaultMaxAttributes("");
    setMonthlyPrice("0");
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
            defaultMaxProducts: defaultMaxProducts.trim() === "" ? null : Number(defaultMaxProducts),
            defaultMaxCategories: defaultMaxCategories.trim() === "" ? null : Number(defaultMaxCategories),
            defaultMaxCategoryMappings: defaultMaxCategoryMappings.trim() === "" ? null : Number(defaultMaxCategoryMappings),
            defaultMaxTransportFirms: defaultMaxTransportFirms.trim() === "" ? null : Number(defaultMaxTransportFirms),
            defaultMaxAttributes: defaultMaxAttributes.trim() === "" ? null : Number(defaultMaxAttributes),
            monthlyPrice: Number(monthlyPrice) || 0,
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
            <span>Max products</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxProducts} onChange={(e) => setDefaultMaxProducts(e.target.value)} />
          </label>
          <label>
            <span>Max categories</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxCategories} onChange={(e) => setDefaultMaxCategories(e.target.value)} />
          </label>
          <label>
            <span>Max category mappings</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxCategoryMappings} onChange={(e) => setDefaultMaxCategoryMappings(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Max transport firms</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxTransportFirms} onChange={(e) => setDefaultMaxTransportFirms(e.target.value)} />
          </label>
          <label>
            <span>Max attributes</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxAttributes} onChange={(e) => setDefaultMaxAttributes(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Monthly price (₹)</span>
            <input type="number" min={0} step="0.01" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} />
          </label>
          <label>
            <span>Sort order</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        </div>
        {!!error && (
          <p className="form-alert" role="alert">
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
  const [defaultMaxProducts, setDefaultMaxProducts] = useState("");
  const [defaultMaxCategories, setDefaultMaxCategories] = useState("");
  const [defaultMaxCategoryMappings, setDefaultMaxCategoryMappings] = useState("");
  const [defaultMaxTransportFirms, setDefaultMaxTransportFirms] = useState("");
  const [defaultMaxAttributes, setDefaultMaxAttributes] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("0");
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
    setDefaultMaxProducts(pkg.defaultMaxProducts === null ? "" : String(pkg.defaultMaxProducts));
    setDefaultMaxCategories(pkg.defaultMaxCategories === null ? "" : String(pkg.defaultMaxCategories));
    setDefaultMaxCategoryMappings(pkg.defaultMaxCategoryMappings === null ? "" : String(pkg.defaultMaxCategoryMappings));
    setDefaultMaxTransportFirms(pkg.defaultMaxTransportFirms === null ? "" : String(pkg.defaultMaxTransportFirms));
    setDefaultMaxAttributes(pkg.defaultMaxAttributes === null ? "" : String(pkg.defaultMaxAttributes));
    setMonthlyPrice(String(pkg.monthlyPrice));
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
            defaultMaxProducts: defaultMaxProducts.trim() === "" ? null : Number(defaultMaxProducts),
            defaultMaxCategories: defaultMaxCategories.trim() === "" ? null : Number(defaultMaxCategories),
            defaultMaxCategoryMappings: defaultMaxCategoryMappings.trim() === "" ? null : Number(defaultMaxCategoryMappings),
            defaultMaxTransportFirms: defaultMaxTransportFirms.trim() === "" ? null : Number(defaultMaxTransportFirms),
            defaultMaxAttributes: defaultMaxAttributes.trim() === "" ? null : Number(defaultMaxAttributes),
            monthlyPrice: Number(monthlyPrice) || 0,
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
        <div className="form-grid">
          <label>
            <span>Max products</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxProducts} onChange={(e) => setDefaultMaxProducts(e.target.value)} />
          </label>
          <label>
            <span>Max categories</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxCategories} onChange={(e) => setDefaultMaxCategories(e.target.value)} />
          </label>
          <label>
            <span>Max category mappings</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxCategoryMappings} onChange={(e) => setDefaultMaxCategoryMappings(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Max transport firms</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxTransportFirms} onChange={(e) => setDefaultMaxTransportFirms(e.target.value)} />
          </label>
          <label>
            <span>Max attributes</span>
            <input type="number" min={0} placeholder="Blank = unlimited" value={defaultMaxAttributes} onChange={(e) => setDefaultMaxAttributes(e.target.value)} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Monthly price (₹)</span>
            <input type="number" min={0} step="0.01" value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} />
          </label>
        </div>
        <label className="checkbox-label">
          <input className="checkbox" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active (shown in the Add Tenant dropdown)
        </label>
        {!!error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        <DialogActions onCancel={onClose} submitLabel={saving ? "Saving…" : "Save package"} disabled={saving} />
      </form>
    </Modal>
  );
}
