"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, User, Settings, LogOut, ExternalLink, Store, ShoppingBag, CreditCard, CheckCircle2, Package, Sparkles, XCircle, Undo2, Star, AlertTriangle } from "lucide-react";

interface Props {
  storeName: string;
  storeSlug: string;
  merchantName: string;
  merchantEmail: string;
  plan: string;
}

const TYPE_ICON: Record<string, ReactNode> = {
  ORDER_NEW:       <ShoppingBag className="w-4 h-4" />,
  ORDER_PAID:      <CreditCard className="w-4 h-4" />,
  ORDER_CONFIRMED: <CheckCircle2 className="w-4 h-4" />,
  ORDER_SHIPPED:   <Package className="w-4 h-4" />,
  ORDER_DELIVERED: <Sparkles className="w-4 h-4" />,
  ORDER_CANCELLED: <XCircle className="w-4 h-4" />,
  ORDER_RETURNED:  <Undo2 className="w-4 h-4" />,
  REVIEW_NEW:      <Star className="w-4 h-4" />,
  LOW_STOCK:       <AlertTriangle className="w-4 h-4" />,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardHeader({ storeName, storeSlug, merchantName, merchantEmail, plan }: Props) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    const r = await fetch("/api/notifications/count");
    if (r.ok) { const d = await r.json(); setUnread(d.count ?? 0); }
  }, []);

  const fetchNotifs = useCallback(async () => {
    setNotifLoading(true);
    const r = await fetch("/api/notifications?page=1");
    if (r.ok) { const d = await r.json(); setNotifications(d.notifications ?? []); }
    setNotifLoading(false);
  }, []);

  // Poll count every 30s
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Open notif panel
  useEffect(() => {
    if (!notifOpen) return;
    fetchNotifs();
  }, [notifOpen, fetchNotifs]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const storeUrl = `/store/${storeSlug}`;
  const planColor = plan === "PRO" ? "text-purple-600 bg-purple-50" : plan === "ENTERPRISE" ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-100";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
      {/* Left — store URL */}
      <Link
        href={storeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors group"
      >
        <Store size={15} className="shrink-0 text-green-600" />
        <span className="font-medium hidden sm:block">
          <span className="text-gray-400">your-domain.com</span>
          <span className="text-gray-700">/store/{storeSlug}</span>
        </span>
        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-green-600" />
      </Link>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} className="text-gray-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-bold text-gray-900 text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-green-600 hover:underline font-medium">
                      Mark all read
                    </button>
                  )}
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    View all →
                  </Link>
                </div>
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="flex justify-center mb-2"><Bell className="w-8 h-8 text-gray-300" /></div>
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 8).map(n => (
                    <Link
                      key={n.id}
                      href={n.link || "/dashboard"}
                      onClick={() => setNotifOpen(false)}
                      className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/40" : ""}`}
                    >
                      <span className="shrink-0 mt-0.5 text-gray-500">{TYPE_ICON[n.type] ?? <Bell className="w-4 h-4" />}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-tight ${!n.read ? "text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </Link>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs text-green-600 hover:underline font-semibold"
                  >
                    View all notifications →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-1 py-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg,#ec1f78,#ff6e30)" }}>
              {merchantName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight max-w-[120px] truncate">{merchantName}</p>
              <p className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit ${planColor}`}>{plan}</p>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
              {/* Account info */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-gray-900 truncate">{merchantName}</p>
                <p className="text-xs text-gray-500 truncate">{merchantEmail}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <User size={15} className="text-gray-500" /> My Profile
                </Link>
                <Link href="/dashboard/settings" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <Settings size={15} className="text-gray-500" /> Store Settings
                </Link>
                <Link href={storeUrl} target="_blank" rel="noopener noreferrer" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <ExternalLink size={15} className="text-gray-500" /> View Store
                </Link>
              </div>
              <div className="p-1.5 border-t border-gray-100">
                <button onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={15} /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
