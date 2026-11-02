import type { ReactNode } from "react";

type Props = {
  title: string;
  count?: ReactNode;
  text: ReactNode;
  children?: ReactNode;
};

export function CardHeading({ title, count, text, children }: Props) {
  return (
    <div className="catalogue-heading">
      <div>
        <h3>
          {title}
          {count !== undefined && (
            <>
              {" "}
              <span className="count-badge">{count}</span>
            </>
          )}
        </h3>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
