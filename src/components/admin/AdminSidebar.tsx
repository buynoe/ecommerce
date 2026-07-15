"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, BadgeDollarSign, Settings, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/merchants",  icon: Users,           label: "Merchants"  },
  { href: "/admin/payments",   icon: CreditCard,      label: "Payments"   },
  { href: "/admin/plans",      icon: BadgeDollarSign, label: "Plans"      },
  { href: "/admin/settings",   icon: Settings,        label: "Settings"   },
];

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside style={{
      width: "240px", flexShrink: 0,
      display: "flex", flexDirection: "column", minHeight: "100vh",
      background: "#0f172a",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
            background: "linear-gradient(135deg, #ec1f78, #ff6e30)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png"
              alt="B"
              style={{ width: "20px", height: "20px", objectFit: "contain", filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div>
            <div style={{ color: "white", fontSize: "0.9375rem", fontWeight: 700, lineHeight: 1.2 }}>Buynoe</div>
            <div style={{ color: "#475569", fontSize: "0.6875rem", lineHeight: 1 }}>Admin Console</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.75rem 0.625rem" }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{ textDecoration: "none", display: "block", marginBottom: "2px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "0.625rem 0.875rem", borderRadius: "10px",
                fontSize: "0.875rem", fontWeight: active ? 600 : 500,
                color: active ? "white" : "#64748b",
                background: active ? "linear-gradient(90deg, #ec1f78, #ff6e30)" : "transparent",
                transition: "all 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = active ? "white" : "#94a3b8"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = active ? "white" : "#64748b"; }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "0.75rem 0.625rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ padding: "0.5rem 0.875rem", marginBottom: "4px" }}>
          <div style={{ color: "white", fontSize: "0.8125rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminName}</div>
          <div style={{ color: "#475569", fontSize: "0.75rem" }}>Super Admin</div>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: "0.625rem 0.875rem", borderRadius: "10px",
            background: "none", border: "none", cursor: "pointer",
            color: "#64748b", fontSize: "0.875rem", fontWeight: 500,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
