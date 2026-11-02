"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
};

/** Native <dialog> shell: showModal() handles focus trap; Escape and backdrop route through onClose. */
export function Modal({
  open,
  onClose,
  titleId,
  title,
  className,
  closeOnBackdrop = true,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className={className}
      aria-labelledby={titleId}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (!closeOnBackdrop || e.target !== e.currentTarget) return;
        // The dialog's own padding also targets the dialog; only clicks outside its box are backdrop clicks.
        const box = e.currentTarget.getBoundingClientRect();
        const inside =
          e.clientX >= box.left &&
          e.clientX <= box.right &&
          e.clientY >= box.top &&
          e.clientY <= box.bottom;
        if (!inside) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
