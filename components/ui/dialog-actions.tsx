import { Check } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  onCancel: () => void;
  submitLabel: ReactNode;
  disabled?: boolean;
};

export function DialogActions({ onCancel, submitLabel, disabled }: Props) {
  return (
    <div className="dialog-actions">
      <button type="button" className="button" onClick={onCancel}>
        Cancel
      </button>
      <button className="primary" type="submit" disabled={disabled}>
        <Check size={17} />
        {submitLabel}
      </button>
    </div>
  );
}
