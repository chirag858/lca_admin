"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Layers,
  FileText,
  LayoutDashboard,
  BarChart3,
  Info,
  Phone,
  HelpCircle,
  Shield,
  Bell,
  ScrollText,
  Workflow,
  ClipboardCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Brand from "./brand";

type NavItem = { label: string; href: string; icon: LucideIcon };

const groups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "PLATFORM",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Registration Requests", href: "/registration-requests", icon: ClipboardCheck },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Tenants & Subscriptions", href: "/tenants", icon: ShieldCheck },
      { label: "Subscription Packages", href: "/packages", icon: Layers },
      { label: "Onboarding", href: "/onboarding", icon: Workflow },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Audit Logs", href: "/audit-logs", icon: ScrollText },
    ],
  },
  {
    heading: "CONTENT PAGES",
    items: [
      { label: "Terms & Conditions", href: "/content/terms-and-conditions", icon: FileText },
      { label: "Privacy Policy", href: "/content/privacy-policy", icon: Shield },
      { label: "About Us", href: "/content/about-us", icon: Info },
      { label: "Contact Us", href: "/content/contact-us", icon: Phone },
      { label: "FAQs", href: "/content/faqs", icon: HelpCircle },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside id="admin-navigation" className="sidebar">
      <Brand />
      <nav>
        {groups.map((group) => (
          <div key={group.heading}>
            <div className="nav-heading">{group.heading}</div>
            {group.items.map(({ label, href, icon: Icon }) => {
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
        ))}
      </nav>
      <div className="sidebar-bottom">
        <span className="live-dot" /> Platform admin <span>v0.1</span>
      </div>
    </aside>
  );
}
