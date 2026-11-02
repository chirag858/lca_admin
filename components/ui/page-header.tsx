import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  trail: string;
  title: string;
  pill?: string;
  description: ReactNode;
  actions?: ReactNode;
  /** Wrap actions in .heading-actions (default). Set false when actions bring their own wrapper. */
  wrapActions?: boolean;
};

export function PageHeader({
  trail,
  title,
  pill,
  description,
  actions,
  wrapActions = true,
}: Props) {
  return (
    <>
      <div className="breadcrumbs">
        {trail} <ChevronRight size={13} />
        <span>{title}</span>
      </div>
      <div className="page-heading">
        <div>
          <div className="title-line">
            <h1>{title}</h1>
            {pill && <span className="pill">{pill}</span>}
          </div>
          <p>{description}</p>
        </div>
        {actions &&
          (wrapActions ? (
            <div className="heading-actions">{actions}</div>
          ) : (
            actions
          ))}
      </div>
    </>
  );
}
