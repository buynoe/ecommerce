"use client";
import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/types";
import Link from "next/link";
import { ShoppingBag, Search, CalendarDays } from "lucide-react";

const STATUSES = ["", "PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

interface Order {
  id: string; orderNumber: string; email: string; phone?: string; total: number; status: string; createdAt: string;
  items: { title: string; product?: { title: string } }[];
  customer?: { firstName: string; lastName: string; email: string } | null;
  shipments: { provider: string | null }[];
}

const TODAY = new Date().toISOString().split("T")[0];
const WEEK_AGO = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const MONTH_AGO = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const r = await fetch(`/api/orders?${params}`);
    const d = await r.json();
    setOrders(d.orders || []); setTotal(d.total || 0);
    setLoading(false);
  }, [page, status, search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function applySearch() { setSearch(searchInput); setPage(1); }
  function clearFilters() { setSearch(""); setSearchInput(""); setDateFrom(""); setDateTo(""); setStatus(""); setPage(1); }
  const hasFilters = search || dateFrom || dateTo || status;

  function setQuickDate(preset: string) {
    if (preset === "today") { setDateFrom(TODAY); setDateTo(TODAY); }
    else if (preset === "week") { setDateFrom(WEEK_AGO); setDateTo(TODAY); }
    else if (preset === "month") { setDateFrom(MONTH_AGO); setDateTo(TODAY); }
    else { setDateFrom(""); setDateTo(""); }
    setPage(1);
  }

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${total} orders total`} />

      {/* Status tabs */}
      <div className="flex gap-0 mb-5 border-b border-gray-200 overflow-x-auto">
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${status === s ? "border-green-600 text-[#ec1f78]" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {s === "" ? "All" : ORDER_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {/* Search + Date filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
          <div className="flex gap-2">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applySearch()}
              placeholder="Order #, customer name, email, phone…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
            />
            <button onClick={applySearch} className="px-3 py-2 btn-brand rounded-lg text-sm font-semibold">
              Search
            </button>
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none" />
        </div>

        {/* Quick date presets */}
        <div className="flex gap-1.5">
          {[{ label: "Today", v: "today" }, { label: "Last 7d", v: "week" }, { label: "Last 30d", v: "month" }].map(d => (
            <button key={d.v} onClick={() => setQuickDate(d.v)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              {d.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 font-medium whitespace-nowrap flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex gap-2 mb-3 flex-wrap text-xs">
          {search && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><Search className="w-4 h-4" />&quot;{search}&quot;</span>}
          {dateFrom && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CalendarDays className="w-4 h-4" />From {dateFrom}</span>}
          {dateTo && <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CalendarDays className="w-4 h-4" />To {dateTo}</span>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">
          <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Loading orders…
        </div>
          : orders.length === 0 ? <div className="p-16 text-center text-gray-400">
            <div className="flex justify-center mb-4"><ShoppingBag className="w-14 h-14 text-gray-300" /></div>
            <p className="font-medium">No orders found</p>
            {hasFilters && <button onClick={clearFilters} className="mt-3 text-[#ec1f78] text-sm hover:underline">Clear filters</button>}
          </div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Order #", "Date", "Customer", "Email", "Items", "Total", "Status", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(o => {
                    const customerName = o.customer
                      ? `${o.customer.firstName} ${o.customer.lastName}`.trim()
                      : o.email.split("@")[0];
                    const firstItem = o.items[0]?.product?.title || o.items[0]?.title || "—";
                    return (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-[#ec1f78]">
                          <Link href={`/dashboard/orders/${o.id}`} className="hover:underline font-mono">{o.orderNumber}</Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-36 truncate">{o.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-32 truncate">
                          {firstItem}{o.items.length > 1 ? ` +${o.items.length - 1}` : ""}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(o.total)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${ORDER_STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600"}`}>
                            {ORDER_STATUS_LABELS[o.status] || o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/orders/${o.id}`} className="text-xs link-brand font-medium hover:underline whitespace-nowrap">View →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {total > 20 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
