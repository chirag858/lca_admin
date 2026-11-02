"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Brand from "./brand";

const menu: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Tenants & Subscriptions", href: "/", icon: ShieldCheck },
  { label: "Subscription Packages", href: "/packages", icon: Layers },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside id="admin-navigation" className="sidebar">
      <Brand />
      <nav>
        <div>
          <div className="nav-heading">PLATFORM</div>
          {menu.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={"nav-item " + (active ? "active" : "")}
              >
                <Icon size={19} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="sidebar-bottom">
        <span className="live-dot" /> Platform admin <span>v0.1</span>
      </div>
    </aside>
  );
}
