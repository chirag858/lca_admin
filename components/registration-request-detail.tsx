"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Contact,
  CreditCard,
  ScrollText,
  LogOut,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  StickyNote,
} from "lucide-react";
import { fetchJson } from "@/lib/http";
import { PageHeader } from "./ui/page-header";
import { CardHeading } from "./ui/card-heading";
import { Skeleton, SkeletonFields } from "./ui/skeleton";
import { Toast } from "./ui/toast";
import { Modal } from "./ui/modal";
import { DialogActions } from "./ui/dialog-actions";
import { useToast } from "@/lib/hooks/use-toast";

type RequestStatus = "VerificationPending" | "UnderReview" | "OnHold" | "Approved" | "Rejected";

type ReviewEvent = {
  id: number;
  eventType: string;
  note: string | null;
  adminUsername: string | null;
  createdAt: string;
};

type RequestDetail = {
  id: string;
  status: RequestStatus;
  tenantName: string;
  businessType: string | null;
  sourceUrl: string | null;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  mobileCountryCode: string | null;
  mobileNumber: string | null;
  username: string;
  requestedPlanCode: string | null;
  trialRequested: boolean;
  isOtpExpired: boolean;
  holdReason: string | null;
  rejectionReason: string | null;
  reviewedByAdminUsername: string | null;
  reviewedAt: string | null;
  tenantId: number | null;
  provisionedAt: string | null;
  createdAt: string;
  verifiedAt: string | null;
  reviewEvents: ReviewEvent[];
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  VerificationPending: "Verification pending",
  UnderReview: "Under review",
  OnHold: "On hold",
  Approved: "Approved",
  Rejected: "Rejected",
};

const EVENT_LABEL: Record<string, string> = {
  Submitted: "Application submitted",
  Verified: "Email verified",
  OnHold: "Put on hold",
  Resumed: "Review resumed",
  Approved: "Approved",
  Rejected: "Rejected",
  Note: "Note added",
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function RegistrationRequestDetailPage({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [modal, setModal] = useState<"approve" | "reject" | "hold" | "note" | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const d = await fetchJson<RequestDetail>(
          `/api/registration-requests/${requestId}`, { signal: controller.signal }, "Unable to load this request.",
        );
        if (controller.signal.aborted) return;
        setDetail(d);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load this request.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [requestId, retry]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function closeModal() {
    setModal(null);
    setReasonText("");
    setModalError("");
  }

  async function submitApprove() {
    setBusy(true);
    setModalError("");
    try {
      const res = await fetchJson<{ tenantId: number; tenantName: string; welcomeEmailSent: boolean; warning: string | null }>(
        `/api/registration-requests/${requestId}/approve`,
        { method: "POST", body: JSON.stringify({ notes: reasonText || undefined }) },
        "Unable to approve this request.",
      );
      show(res.warning || `Approved — workspace "${res.tenantName}" created.`);
      closeModal();
      setRetry((n) => n + 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to approve this request.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    if (!reasonText.trim()) { setModalError("Enter a reason."); return; }
    setBusy(true);
    setModalError("");
    try {
      await fetchJson(
        `/api/registration-requests/${requestId}/reject`,
        { method: "POST", body: JSON.stringify({ reason: reasonText.trim() }) },
        "Unable to reject this request.",
      );
      show("Request rejected.");
      closeModal();
      setRetry((n) => n + 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to reject this request.");
    } finally {
      setBusy(false);
    }
  }

  async function submitHold() {
    if (!reasonText.trim()) { setModalError("Enter a reason."); return; }
    setBusy(true);
    setModalError("");
    try {
      await fetchJson(
        `/api/registration-requests/${requestId}/hold`,
        { method: "POST", body: JSON.stringify({ reason: reasonText.trim() }) },
        "Unable to put this request on hold.",
      );
      show("Request put on hold.");
      closeModal();
      setRetry((n) => n + 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to put this request on hold.");
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    if (!reasonText.trim()) { setModalError("Enter a note."); return; }
    setBusy(true);
    setModalError("");
    try {
      await fetchJson(
        `/api/registration-requests/${requestId}/notes`,
        { method: "POST", body: JSON.stringify({ note: reasonText.trim() }) },
        "Unable to add this note.",
      );
      show("Note added.");
      closeModal();
      setRetry((n) => n + 1);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Unable to add this note.");
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    setBusy(true);
    try {
      await fetchJson(`/api/registration-requests/${requestId}/resume`, { method: "POST" }, "Unable to resume review.");
      show("Review resumed.");
      setRetry((n) => n + 1);
    } catch (err) {
      show(err instanceof Error ? err.message : "Unable to resume review.");
    } finally {
      setBusy(false);
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
          trail="Admin / Registration Requests"
          title={loading ? "Loading…" : detail?.tenantName || "Request"}
          pill={detail ? STATUS_LABEL[detail.status] : undefined}
          description="Full application detail — review it, then approve, reject, or put it on hold."
          actions={
            <>
              <button type="button" className="button" onClick={() => router.push("/registration-requests")}>
                <ArrowLeft size={16} /> Back to inbox
              </button>
              {detail?.status === "UnderReview" && (
                <>
                  <button type="button" className="button" onClick={() => { setModal("hold"); setModalError(""); }}>
                    <PauseCircle size={16} /> Put on hold
                  </button>
                  <button type="button" className="danger" onClick={() => { setModal("reject"); setModalError(""); }}>
                    <XCircle size={16} /> Reject
                  </button>
                  <button type="button" className="primary" onClick={() => { setModal("approve"); setModalError(""); }}>
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </>
              )}
              {detail?.status === "OnHold" && (
                <>
                  <button type="button" className="danger" onClick={() => { setModal("reject"); setModalError(""); }}>
                    <XCircle size={16} /> Reject
                  </button>
                  <button type="button" className="button" onClick={resume} disabled={busy}>
                    <PlayCircle size={16} /> Resume review
                  </button>
                </>
              )}
            </>
          }
        />

        {error && !loading && (
          <section className="card">
            <p role="alert" style={{ padding: 24 }}>{error}</p>
          </section>
        )}

        {detail && (
          <>
            <section className="card catalogue">
              <CardHeading title="Business profile" text="What the applicant told us about their business." />
              <div className="detail-grid" style={{ padding: "0 24px 24px" }}>
                <Field label="Workspace name" icon={<Building2 size={15} />} value={detail.tenantName} />
                <Field label="Business type" value={detail.businessType || "—"} />
                <Field label="Website" value={detail.sourceUrl || "—"} />
              </div>
            </section>

            <section className="card catalogue">
              <CardHeading title="Owner & contact" text="The person who will own this workspace." />
              <div className="detail-grid" style={{ padding: "0 24px 24px" }}>
                <Field label="Name" icon={<Contact size={15} />} value={`${detail.adminFirstName} ${detail.adminLastName}`} />
                <Field label="Email" value={detail.email} />
                <Field
                  label="Mobile"
                  value={detail.mobileNumber ? `${detail.mobileCountryCode ?? ""} ${detail.mobileNumber}`.trim() : "—"}
                />
                <Field label="Username" value={detail.username} />
                <Field label="Email verified" value={fmtDate(detail.verifiedAt)} />
              </div>
            </section>

            <section className="card catalogue">
              <CardHeading title="Subscription" text="What plan the applicant asked for — confirm or change it when approving." />
              <div className="detail-grid" style={{ padding: "0 24px 24px" }}>
                <Field label="Requested plan" icon={<CreditCard size={15} />} value={detail.requestedPlanCode || "Not specified"} />
                <Field label="Trial requested" value={detail.trialRequested ? "Yes" : "No"} />
                {detail.tenantId && <Field label="Tenant" value={`#${detail.tenantId}`} />}
                {detail.provisionedAt && <Field label="Provisioned" value={fmtDate(detail.provisionedAt)} />}
              </div>
            </section>

            {(detail.holdReason || detail.rejectionReason) && (
              <section className="card catalogue">
                <CardHeading title={detail.status === "Rejected" ? "Rejection reason" : "Hold reason"} text="Recorded by the reviewing admin." />
                <div style={{ padding: "0 24px 24px" }}>
                  <p>{detail.rejectionReason || detail.holdReason}</p>
                  {detail.reviewedByAdminUsername && (
                    <p className="table-subtext">By {detail.reviewedByAdminUsername} · {fmtDate(detail.reviewedAt)}</p>
                  )}
                </div>
              </section>
            )}

            <section className="card catalogue">
              <CardHeading
                title="Activity log"
                text="Every status change and internal note on this request."
                children={
                  <button type="button" className="button" onClick={() => { setModal("note"); setModalError(""); }}>
                    <StickyNote size={16} /> Add note
                  </button>
                }
              />
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>NOTE</th>
                      <th>ADMIN</th>
                      <th>WHEN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.reviewEvents.map((ev) => (
                      <tr key={ev.id}>
                        <td>
                          <span className="usage-pill usage-amber" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <ScrollText size={13} /> {EVENT_LABEL[ev.eventType] || ev.eventType}
                          </span>
                        </td>
                        <td>{ev.note || "—"}</td>
                        <td>{ev.adminUsername || "System"}</td>
                        <td>{fmtDate(ev.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {loading && (
          <section className="card catalogue">
            <div style={{ padding: 24 }}>
              <Skeleton height={20} width="40%" />
              <div style={{ marginTop: 16 }}>
                <SkeletonFields count={4} />
              </div>
            </div>
          </section>
        )}
      </main>

      <Modal open={modal === "approve"} onClose={closeModal} titleId="approve-title" title="Approve registration request" className="approve-dialog">
        <form onSubmit={(e) => { e.preventDefault(); void submitApprove(); }} noValidate>
          <div className="approve-summary">
            <span className="icon-tile green"><CheckCircle2 size={22} /></span>
            <div>
              <strong>{detail?.tenantName}</strong>
              <span>
                Workspace will be created for {detail?.adminFirstName} {detail?.adminLastName} on the{" "}
                <strong>{detail?.requestedPlanCode || "Basic"}</strong> plan.
              </span>
            </div>
          </div>
          <div className="form-grid">
            <label>
              {/* <span>Internal note <small>(optional, not shown to the applicant)</small></span> */}
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="e.g. Verified by phone, documents checked…"
                autoFocus
              />
            </label>
          </div>
          {!!modalError && <p className="form-alert" role="alert">{modalError}</p>}
          <DialogActions onCancel={closeModal} submitLabel={busy ? "Approving…" : "Approve & create workspace"} disabled={busy} />
        </form>
      </Modal>

      <Modal open={modal === "reject"} onClose={closeModal} titleId="reject-title" title="Reject registration request">
        <form onSubmit={(e) => { e.preventDefault(); void submitReject(); }} noValidate>
          <div className="form-grid">
            <label>
              <span>Reason (shown to the applicant)</span>
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} maxLength={1000} rows={3} autoFocus />
            </label>
          </div>
          {!!modalError && <p className="form-alert" role="alert">{modalError}</p>}
          <DialogActions onCancel={closeModal} submitLabel={busy ? "Rejecting…" : "Reject request"} disabled={busy} />
        </form>
      </Modal>

      <Modal open={modal === "hold"} onClose={closeModal} titleId="hold-title" title="Put request on hold">
        <form onSubmit={(e) => { e.preventDefault(); void submitHold(); }} noValidate>
          <div className="form-grid">
            <label>
              <span>Reason (internal)</span>
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} maxLength={1000} rows={3} autoFocus />
            </label>
          </div>
          {!!modalError && <p className="form-alert" role="alert">{modalError}</p>}
          <DialogActions onCancel={closeModal} submitLabel={busy ? "Saving…" : "Put on hold"} disabled={busy} />
        </form>
      </Modal>

      <Modal open={modal === "note"} onClose={closeModal} titleId="note-title" title="Add an internal note">
        <form onSubmit={(e) => { e.preventDefault(); void submitNote(); }} noValidate>
          <div className="form-grid">
            <label>
              <span>Note</span>
              <textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} maxLength={2000} rows={3} autoFocus />
            </label>
          </div>
          {!!modalError && <p className="form-alert" role="alert">{modalError}</p>}
          <DialogActions onCancel={closeModal} submitLabel={busy ? "Saving…" : "Add note"} disabled={busy} />
        </form>
      </Modal>

      <Toast message={toast} onDismiss={dismiss} />
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="detail-field">
      <span>{icon}{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
