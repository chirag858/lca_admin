import Link from "next/link";

const AVATAR_COLORS = ["#696cff", "#58a1e5", "#39ae87", "#e9a54a", "#dc6f77", "#8c80d7", "#2fb0c9"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? "")).toUpperCase();
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Avatar + name (+ optional subtext) link, used wherever a tenant is listed in a table. */
export function TenantCell({
  tenantId,
  tenantName,
  subtext,
}: {
  tenantId: number;
  tenantName: string;
  subtext?: string | null;
}) {
  return (
    <Link href={`/tenants/${tenantId}`} className="tenant-cell">
      <span className="tenant-avatar" style={{ background: avatarColor(tenantName) }}>
        {initials(tenantName)}
      </span>
      <span className="tenant-cell-copy">
        <strong>{tenantName}</strong>
        {subtext && <small>{subtext}</small>}
      </span>
    </Link>
  );
}
