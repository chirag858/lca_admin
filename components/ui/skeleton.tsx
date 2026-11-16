import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
  className?: string;
};

export function Skeleton({ width = "100%", height = 14, radius = 6, style, className }: SkeletonProps) {
  return (
    <span
      className={"skeleton " + (className ?? "")}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A table body of shimmering placeholder rows, matching a given column count. */
export function SkeletonRows({
  rows = 6,
  cols,
  widths,
}: {
  rows?: number;
  cols: number;
  widths?: (number | string)[];
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c}>
              <Skeleton height={13} width={widths?.[c] ?? (c === 0 ? "60%" : "45%")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** A row of stat-card shimmers matching the `.stats` grid. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <section className="stats">
      {Array.from({ length: count }).map((_, i) => (
        <article className="card stat" key={i}>
          <div>
            <Skeleton width={70} height={11} />
            <div style={{ marginTop: 10 }}>
              <Skeleton width={56} height={26} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Skeleton width={90} height={9} />
            </div>
          </div>
          <Skeleton width={44} height={44} radius={10} />
        </article>
      ))}
    </section>
  );
}

/** A `.card.catalogue` shimmer standing in for a chart or breakdown widget. */
export function SkeletonChartCard({ height = 180 }: { height?: number }) {
  return (
    <section className="card catalogue">
      <div style={{ padding: 24, display: "grid", gap: 8 }}>
        <Skeleton width={160} height={15} />
        <Skeleton width={220} height={11} />
      </div>
      <div style={{ padding: "0 24px 24px" }}>
        <Skeleton width="100%" height={height} radius={10} />
      </div>
    </section>
  );
}

/** A form-grid of label/value shimmer pairs, matching `.form-grid` detail cards. */
export function SkeletonFields({ count = 8 }: { count?: number }) {
  return (
    <div className="form-grid" style={{ padding: "0 24px 24px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "grid", gap: 8 }}>
          <Skeleton width={90} height={9} />
          <Skeleton width="70%" height={14} />
        </div>
      ))}
    </div>
  );
}
