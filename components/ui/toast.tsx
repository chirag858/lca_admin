import { CheckCircle2, X } from "lucide-react";

type Props = { message: string; onDismiss: () => void };

export function Toast({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={20} />
      {message}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <X size={16} />
      </button>
    </div>
  );
}
