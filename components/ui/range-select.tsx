export type AnalyticsRange = "weekly" | "quarterly" | "yearly" | "all";

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "all", label: "All time" },
];

/** Cutoff Date for a range, or null for "all" (no lower bound). */
export function rangeCutoff(range: AnalyticsRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === "weekly") cutoff.setDate(now.getDate() - 7);
  else if (range === "quarterly") cutoff.setMonth(now.getMonth() - 3);
  else cutoff.setFullYear(now.getFullYear() - 1);
  return cutoff;
}

export function RangeSelect({ value, onChange }: { value: AnalyticsRange; onChange: (value: AnalyticsRange) => void }) {
  return (
    <div className="range-select" role="tablist" aria-label="Date range">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          className={"range-select-tab" + (value === opt.value ? " active" : "")}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
