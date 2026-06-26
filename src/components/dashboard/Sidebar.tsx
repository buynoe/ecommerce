"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Package, Tag, Layers, Warehouse,
  Users, Star, BadgePercent, Ticket, Truck, Rocket, CreditCard,
  RotateCcw, Image as ImageIcon, Megaphone, BarChart2, Settings,
  Crown, Zap, LogOut, UserCircle, type LucideIcon,
} from "lucide-react";

interface NavItem { label: string; href: string; icon: LucideIcon; highlight?: boolean }
interface NavGroup { group: string; items: NavItem[] }

const nav: NavGroup[] = [
  {
    group: "Main",
    items: [
      { label: "Overview",  href: "/dashboard",           icon: LayoutDashboard },
      { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    ],
  },
  {
    group: "Catalog",
    items: [
      { label: "Products",    href: "/dashboard/products",    icon: Package },
      { label: "Categories",  href: "/dashboard/categories",  icon: Tag },
      { label: "Collections", href: "/dashboard/collections", icon: Layers },
      { label: "Inventory",   href: "/dashboard/inventory",   icon: Warehouse },
    ],
  },
  {
    group: "Sales",
    items: [
      { label: "Orders",   href: "/dashboard/orders",   icon: ShoppingBag },
      { label: "Returns",  href: "/dashboard/returns",  icon: RotateCcw },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
    ],
  },
  {
    group: "Customers",
    items: [
      { label: "Customers", href: "/dashboard/customers", icon: Users },
      { label: "Reviews",   href: "/dashboard/reviews",   icon: Star },
    ],
  },
  {
    group: "Marketing",
    items: [
      { label: "Discounts", href: "/dashboard/discounts", icon: BadgePercent },
      { label: "Coupons",   href: "/dashboard/coupons",   icon: Ticket },
      { label: "Banners",   href: "/dashboard/banners",   icon: Megaphone },
      { label: "Gallery",   href: "/dashboard/gallery",   icon: ImageIcon },
    ],
  },
  {
    group: "Fulfillment",
    items: [
      { label: "Shipping",         href: "/dashboard/shipping", icon: Truck },
      { label: "Courier Partners", href: "/dashboard/courier",  icon: Rocket },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Settings",      href: "/dashboard/settings", icon: Settings },
      { label: "My Profile",    href: "/dashboard/profile",  icon: UserCircle },
      { label: "Plan & Billing",href: "/dashboard/billing",  icon: Crown },
      { label: "Upgrade Plan",  href: "/dashboard/billing",  icon: Zap, highlight: true },
    ],
  },
];

export default function Sidebar({ storeName, plan, logo }: { storeName?: string; plan?: string; logo?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-60 min-h-screen bg-gray-950 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          {logo ? (
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-700">
              <Image src={logo} alt={storeName || "Store"} width={36} height={36} className="w-full h-full object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#ec1f78,#ff6e30)" }}>
              <span className="text-white font-black text-sm">{(storeName || "BN").slice(0, 2).toUpperCase()}</span>
            </div>
          )}
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm truncate">{storeName || "Buynoe"}</div>
            <div className="text-xs text-gray-500">{plan || "Trial"} Plan</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {nav.map((section, si) => (
          <div key={section.group} className={si > 0 ? "mt-3" : ""}>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              {section.group}
            </div>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const Icon = item.icon;
                const active = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
                if (item.highlight) {
                  return (
                    <Link key={`${item.href}-${item.label}`} href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-white mt-1"
                      style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
                      <Icon size={16} className="shrink-0" />
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <Link key={`${item.href}-${item.label}`} href={item.href}
                    className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      active ? "text-white" : "text-gray-400 hover:text-white hover:bg-gray-800")}
                    style={active ? { background: "linear-gradient(90deg,#ec1f78,#ff6e30)" } : {}}>
                    <Icon size={16} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-3 pt-3 border-t border-gray-800">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800">
            <LogOut size={16} className="shrink-0" />
            Log out
          </button>
        </div>
      </nav>
    </aside>
  );
}
