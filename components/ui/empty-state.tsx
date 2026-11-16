import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  text: ReactNode;
  action?: ReactNode;
  /** Shows a sleek spinning ring instead of the static icon. */
  loading?: boolean;
};

export function EmptyState({ icon, title, text, action, loading }: Props) {
  return (
    <div className="empty">
      <span className={"empty-icon" + (loading ? " loading" : "")}>
        {loading ? <Loader2 size={24} className="spin" /> : icon}
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
