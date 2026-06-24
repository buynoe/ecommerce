"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

interface Notification {
  id: string; type: string; title: string; message: string;
  link?: string | null; read: boolean; createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  ORDER_NEW:       "🛍️",
  ORDER_PAID:      "💳",
  ORDER_CONFIRMED: "✅",
  ORDER_SHIPPED:   "📦",
  ORDER_DELIVERED: "🎉",
  ORDER_CANCELLED: "❌",
  ORDER_RETURNED:  "↩️",
  REVIEW_NEW:      "⭐",
  LOW_STOCK:       "⚠️",
};

const TYPE_LABEL: Record<string, string> = {
  ORDER_NEW: "New Order", ORDER_PAID: "Payment", ORDER_CONFIRMED: "Confirmed",
  ORDER_SHIPPED: "Shipped", ORDER_DELIVERED: "Delivered", ORDER_CANCELLED: "Cancelled",
  ORDER_RETURNED: "Returned", REVIEW_NEW: "Review", LOW_STOCK: "Low Stock",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const TYPE_FILTERS = ["All", "Orders", "Payments", "Reviews", "Stock"];
const filterMap: Record<string, string[]> = {
  Orders:   ["ORDER_NEW", "ORDER_CONFIRMED", "ORDER_SHIPPED", "ORDER_DELIVERED", "ORDER_CANCELLED", "ORDER_RETURNED"],
  Payments: ["ORDER_PAID"],
  Reviews:  ["REVIEW_NEW"],
  Stock:    ["LOW_STOCK"],
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const r = await fetch(`/api/notifications?page=${p}`);
    if (r.ok) {
      const d = await r.json();
      setNotifications(d.notifications ?? []);
      setTotal(d.total ?? 0);
      setUnread(d.unread ?? 0);
      setPage(d.page ?? 1);
      setPages(d.pages ?? 1);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  async function markAllRead() {
    setMarking(true);
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setMarking(false);
    load(page);
  }

  const filtered = filter === "All"
    ? notifications
    : notifications.filter(n => (filterMap[filter] ?? []).includes(n.type));

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${total} total · ${unread} unread`}
        action={
          unread > 0 ? (
            <button onClick={markAllRead} disabled={marking}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              <CheckCheck size={15} /> {marking ? "Marking…" : "Mark all as read"}
            </button>
          ) : null
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TYPE_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              filter === f
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-200 text-gray-600 hover:border-gray-400 bg-white"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-gray-200">
          <Bell size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-semibold">No notifications</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter !== "All" ? "No notifications match this filter." : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filtered.map((n, i) => (
            <div key={n.id}
              className={`flex gap-4 px-5 py-4 transition-colors ${
                !n.read ? "bg-blue-50/50" : "bg-white"
              } ${i > 0 ? "border-t border-gray-100" : ""}`}>
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gray-50 border border-gray-100">
                {TYPE_ICON[n.type] ?? "🔔"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {n.link && (
                  <Link href={n.link}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 font-semibold hover:underline">
                    View details →
                  </Link>
                )}
              </div>

              {/* Unread indicator */}
              <div className="flex items-start pt-1">
                {!n.read ? (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                ) : (
                  <Trash2 size={14} className="text-gray-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => load(page - 1)} disabled={page <= 1}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= pages}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
