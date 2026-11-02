import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  text: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ icon, title, text, action }: Props) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
