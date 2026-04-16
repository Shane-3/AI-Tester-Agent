"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  Lightbulb,
  Activity,
  Code2,
  MessageSquare,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/test-studio", label: "Test Studio", icon: FlaskConical },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/code-fixes", label: "Code Intelligence", icon: Code2 },
  { href: "/ask", label: "Ask AI", icon: MessageSquare },
  { href: "/timeline", label: "Timeline", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border-color)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          AI Tester Agent
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          Release Intelligence
        </div>
      </div>

      <nav style={{ padding: "8px 0", flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
