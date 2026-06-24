"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CreditCard, BadgeDollarSign, Settings,
  LogOut, ChevronRight,
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
    <aside className="w-60 shrink-0 flex flex-col min-h-screen" style={{ background: "#0f172a" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <img
          src="https://res.cloudinary.com/dmgoeretb/image/upload/v1782005769/Primary_Mark_01_3x_hvqgmk.png"
          alt="Buynoe"
          className="h-8 w-auto object-contain mb-2"
        />
        <div className="text-gray-500 text-xs">Admin Console</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
              style={active ? { background: "linear-gradient(90deg,#ec1f78 0%,#ff6e30 100%)" } : {}}
            >
              <Icon size={17} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-1">
          <div className="text-white text-xs font-medium truncate">{adminName}</div>
          <div className="text-gray-500 text-xs">Administrator</div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
