"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Pencil, RefreshCcw } from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { Skeleton, SkeletonFields } from "./ui/skeleton";
import { StatusPill } from "./ui/status-pill";
import { Toast } from "./ui/toast";
import { useToast } from "@/lib/hooks/use-toast";
import {
  EditPackageModal,
  RESOURCE_LIMIT_FIELDS,
  fmtLimit,
  type Package,
} from "./packages";

export default function PackageDetailPage({ code }: { code: string }) {
  const router = useRouter();
  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState(false);
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
          "Unable to load subscription package.",
        );
        if (controller.signal.aborted) return;
        const found = data.find((p) => p.code === code) ?? null;
        setPkg(found);
        if (!found) setError("Package not found.");
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load subscription package.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [code, retry]);

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
            trail="Admin / Packages"
            title={pkg ? pkg.displayName : loading ? "" : "Package"}
            pill={pkg ? (pkg.isActive ? undefined : "Retired") : undefined}
            description="Full detail of this subscription package: default limits, pricing, and status."
            actions={
              <>
                <button type="button" className="button" onClick={() => router.push("/packages")}>
                  <ArrowLeft size={16} /> Back to packages
                </button>
                {pkg && (
                  <button type="button" className="primary" onClick={() => setEditing(true)}>
                    <Pencil size={16} /> Edit package
                  </button>
                )}
              </>
            }
          />

          {error && !pkg && (
            <section className="card module-placeholder">
              <h2>Unable to load package</h2>
              <p role="alert">{error}</p>
              <button type="button" className="button" onClick={() => setRetry((n) => n + 1)}>
                Retry
              </button>
            </section>
          )}

          {!error && (loading || !pkg) && (
            <section className="card catalogue">
              <div style={{ padding: 24, display: "grid", gap: 8 }}>
                <Skeleton width={180} height={16} />
                <Skeleton width={260} height={12} />
              </div>
              <SkeletonFields />
            </section>
          )}

          {pkg && (
            <>
              <div className="stats">
                <article className="card stat">
                  <div>
                    <span>Status</span>
                    <h2>
                      <StatusPill on={pkg.isActive} onLabel="Active" offLabel="Retired" />
                    </h2>
                    <small className="text-muted">
                      {pkg.isActive ? "Shown in the Add Tenant dropdown." : "Hidden from the Add Tenant dropdown."}
                    </small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Monthly price</span>
                    <h2 style={{ fontSize: 20 }}>
                      ₹{pkg.monthlyPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </h2>
                    <small className="text-muted">Code: {pkg.code}</small>
                  </div>
                </article>
                <article className="card stat">
                  <div>
                    <span>Sort order</span>
                    <h2 style={{ fontSize: 20 }}>{pkg.sortOrder}</h2>
                    <small className="text-muted">Lower appears first in listings.</small>
                  </div>
                </article>
              </div>

              <section className="card catalogue">
                <CardHeading title="Default firm & staff limits" text="Applied to a tenant when onboarded onto this plan." />
                <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                  <label>
                    <span>Max firms</span>
                    <p>{fmtLimit(pkg.defaultMaxFirms)}</p>
                  </label>
                  <label>
                    <span>Max staff / firm</span>
                    <p>{fmtLimit(pkg.defaultMaxStaffPerFirm)}</p>
                  </label>
                  <label>
                    <span>Max staff total</span>
                    <p>{fmtLimit(pkg.defaultMaxStaffTotal)}</p>
                  </label>
                </div>
              </section>

              <section className="card catalogue">
                <CardHeading title="Catalog limits" text="Caps on products, categories, and related resources." />
                <div className="form-grid" style={{ padding: "0 24px 24px" }}>
                  <label>
                    <span>Max products</span>
                    <p>{fmtLimit(pkg.defaultMaxProducts)}</p>
                  </label>
                  <label>
                    <span>Max categories</span>
                    <p>{fmtLimit(pkg.defaultMaxCategories)}</p>
                  </label>
                  <label>
                    <span>Max category mappings</span>
                    <p>{fmtLimit(pkg.defaultMaxCategoryMappings)}</p>
                  </label>
                  <label>
                    <span>Max transport firms</span>
                    <p>{fmtLimit(pkg.defaultMaxTransportFirms)}</p>
                  </label>
                  <label>
                    <span>Max attributes</span>
                    <p>{fmtLimit(pkg.defaultMaxAttributes)}</p>
                  </label>
                  {RESOURCE_LIMIT_FIELDS.map(({ key, label }) => (
                    <label key={key}>
                      <span>{label}</span>
                      <p>{fmtLimit(pkg.resourceLimits?.[key] ?? null)}</p>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
      <Toast message={toast} onDismiss={dismissToast} />
      {pkg && (
        <EditPackageModal
          pkg={editing ? pkg : null}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            notify("Package was updated.");
            setRetry((n) => n + 1);
          }}
        />
      )}
    </>
  );
}
