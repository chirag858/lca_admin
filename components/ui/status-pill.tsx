type Props = { on: boolean; onLabel?: string; offLabel?: string };

export function StatusPill({
  on,
  onLabel = "Active",
  offLabel = "Disabled",
}: Props) {
  return (
    <span className={"status-pill " + (on ? "on" : "off")}>
      {on ? onLabel : offLabel}
    </span>
  );
}
