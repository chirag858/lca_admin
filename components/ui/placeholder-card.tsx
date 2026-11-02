import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  text?: ReactNode;
  children?: ReactNode;
  /** Shows an animated loading icon instead of plain text. */
  loading?: boolean;
};

export function PlaceholderCard({ title, text, children, loading }: Props) {
  return (
    <section className="card module-placeholder">
      {loading && (
        <span className="icon-tile">
          <Loader2 size={23} className="spin" />
        </span>
      )}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </section>
  );
}
