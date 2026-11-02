"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Modern replacement for window.confirm(): styled modal with a danger-aware confirm button. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;
  return (
    <Modal
      open
      onClose={onCancel}
      titleId="confirm-dialog-title"
      title=""
      className="confirm-dialog"
      closeOnBackdrop={false}
    >
      <div className="confirm-dialog-body">
        <span className={"icon-tile" + (danger ? " danger" : "")}>
          <AlertTriangle size={22} />
        </span>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{description}</p>
      </div>
      <div className="dialog-actions">
        <button type="button" className="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? "danger" : "primary"}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
