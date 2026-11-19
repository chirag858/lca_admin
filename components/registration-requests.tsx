"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  RefreshCcw,
  ClipboardCheck,
  MailCheck,
  PauseCircle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { EmptyState } from "./ui/empty-state";
import { SkeletonRows } from "./ui/skeleton";
import { SearchInput } from "./ui/search-input";
import { Select, type SelectOption } from "./select";
import Link from "next/link";

type RequestStatus = "VerificationPending" | "UnderReview" | "OnHold" | "Approved" | "Rejected";

type RegistrationRequestListItem = {
  id: string;
  status: RequestStatus;
  tenantName: string;
  businessType: string | null;
  contactName: string;
  email: string;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  requestedPlanCode: string | null;
  trialRequested: boolean;
  isOtpExpired: boolean;
  createdAt: string;
  verifiedAt: string | null;
  reviewedAt: string | null;
  tenantId: number | null;
};

const STATUS_META: Record<RequestStatus, { label: string; icon: typeof MailCheck; pill: string }> = {
  VerificationPending: { label: "Verification pending", icon: MailCheck, pill: "usage-pill usage-red" },
  UnderReview: { label: "Under review", icon: ClipboardCheck, pill: "usage-pill usage-amber" },
  OnHold: { label: "On hold", icon: PauseCircle, pill: "usage-pill usage-amber" },
  Approved: { label: "Approved", icon: CheckCircle2, pill: "usage-pill usage-green" },
  Rejected: { label: "Rejected", icon: XCircle, pill: "usage-pill usage-red" },
};

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "All statuses" },
  { value: "VerificationPending", label: "Verification pending" },
  { value: "UnderReview", label: "Under review" },
  { value: "OnHold", label: "On hold" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

export default function RegistrationRequests() {
  const router = useRouter();
  const [entries, setEntries] = useState<RegistrationRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchJson<RegistrationRequestListItem[]>(
          "/api/registration-requests",
          { signal: controller.signal },
          "Unable to load registration requests.",
        );
        if (!controller.signal.aborted) setEntries(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : "Unable to load registration requests.");
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
    const c = { VerificationPending: 0, UnderReview: 0, OnHold: 0, Approved: 0, Rejected: 0 };
    for (const e of entries) c[e.status]++;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (status && e.status !== status) return false;
      if (!q) return true;
      return (
        e.tenantName.toLowerCase().includes(q) ||
        e.contactName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      );
    });
  }, [entries, search, status]);

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
          title="Registration Requests"
          pill="Inbox"
          description="The entry point into the platform. Review each applicant, then approve, reject, or put on hold — registration approval is separate from payment."
        />

        <section className="stats">
          <article className="card stat">
            <div>
              <span>Verification pending</span>
              <h2>{String(counts.VerificationPending).padStart(2, "0")}</h2>
              <small>Email not verified yet</small>
            </div>
            <span className="icon-tile orange"><MailCheck size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>Under review</span>
              <h2>{String(counts.UnderReview).padStart(2, "0")}</h2>
              <small>Awaiting a decision</small>
            </div>
            <span className="icon-tile violet"><ClipboardCheck size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>On hold</span>
              <h2>{String(counts.OnHold).padStart(2, "0")}</h2>
              <small>Needs more information</small>
            </div>
            <span className="icon-tile blue"><PauseCircle size={23} /></span>
          </article>
          <article className="card stat">
            <div>
              <span>Approved</span>
              <h2>{String(counts.Approved).padStart(2, "0")}</h2>
              <small>Workspace provisioned</small>
            </div>
            <span className="icon-tile green"><CheckCircle2 size={23} /></span>
          </article>
        </section>

        <section className="card catalogue">
          <CardHeading
            title="Applications"
            count={`${filtered.length} of ${entries.length}`}
            text="Newest first. Open a request to see the full application and act on it."
          />
          <div className="filters">
            <SearchInput
              value={search}
              onChange={setSearch}
              label="Search requests"
              placeholder="Search by workspace, contact or email…"
            />
            <Select ariaLabel="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>WORKSPACE</th>
                  <th>CONTACT</th>
                  <th>PLAN REQUESTED</th>
                  <th>STATUS</th>
                  <th>SUBMITTED</th>
                </tr>
              </thead>
              <tbody>
                {loading && <SkeletonRows cols={5} widths={["55%", "60%", "40%", "45%", "40%"]} />}
                {!loading &&
                  filtered.map((e) => {
                    const meta = STATUS_META[e.status];
                    const Icon = meta.icon;
                    return (
                      <tr key={e.id}>
                        <td>
                          <Link href={`/registration-requests/${e.id}`} className="tenant-cell">
                            <span className="tenant-avatar" style={{ background: "#696cff" }}>{initials(e.tenantName)}</span>
                            <span className="tenant-cell-copy">
                              <strong>{e.tenantName}</strong>
                              {e.businessType && <small>{e.businessType}</small>}
                            </span>
                          </Link>
                        </td>
                        <td>
                          {e.contactName}
                          <span className="table-subtext">{e.email}</span>
                        </td>
                        <td>{e.requestedPlanCode || "—"}{e.trialRequested ? " (trial)" : ""}</td>
                        <td>
                          <span className={meta.pill} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Icon size={13} /> {meta.label}
                          </span>
                          {e.isOtpExpired && <span className="table-subtext">Code expired</span>}
                        </td>
                        <td>{fmtDate(e.createdAt)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!loading && !filtered.length && (
              <EmptyState
                icon={<ClipboardCheck size={28} />}
                title={error ? "Unable to load registration requests" : entries.length ? "No requests match your filters" : "No applications yet"}
                text={
                  <span role={error ? "alert" : "status"}>
                    {error || (entries.length ? "Try a different search or status." : "New self-service applications will show up here.")}
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
