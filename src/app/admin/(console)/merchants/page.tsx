"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, CheckCircle2, Clock, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#6366f1", BASIC: "#0891b2", PRO: "#ec1f78", ENTERPRISE: "#16a34a",
};

type Merchant = {
  id: string; name: string; email: string; phone: string | null;
  plan: string; planStatus: string; emailVerified: boolean;
  createdAt: string; trialEndsAt: string | null;
  store?: { name: string; slug: string; _count: { orders: number; products: number; customers: number } };
};

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage]   = useState(1);
  const [q, setQ]         = useState("");
  const [plan, setPlan]   = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    const params = new URLSearchParams({ q, plan, status, page: String(pg) });
    const res = await fetch(`/api/admin/merchants?${params}`);
    const d = await res.json();
    setMerchants(d.merchants ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }, [q, plan, status, page]);

  useEffect(() => { setPage(1); }, [q, plan, status]);
  useEffect(() => { load(page); }, [page, q, plan, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changePlan(id: string, newPlan: string) {
    await fetch(`/api/admin/merchants/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: newPlan }),
    });
    load(page);
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    await fetch(`/api/admin/merchants/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planStatus: next }),
    });
    load(page);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total merchants</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>
        <select value={plan} onChange={e => setPlan(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
          <option value="">All Plans</option>
          {["TRIAL", "BASIC", "PRO", "ENTERPRISE"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Merchant", "Plan", "Store", "Orders", "Status", "Trial Ends", "Verified", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3.5 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
                : merchants.length === 0
                  ? <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">No merchants found</td></tr>
                  : merchants.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.email}</div>
                        {m.phone && <div className="text-xs text-gray-400">+91 {m.phone}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <select value={m.plan}
                          onChange={e => changePlan(m.id, e.target.value)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                          style={{ background: `${PLAN_COLORS[m.plan]}18`, color: PLAN_COLORS[m.plan] }}>
                          {["TRIAL", "BASIC", "PRO", "ENTERPRISE"].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        {m.store ? (
                          <a href={`/store/${m.store.slug}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            {m.store.name} <ExternalLink size={10} />
                          </a>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {m.store && m.store._count.orders > 0 ? (
                          <Link href={`/admin/merchants/${m.id}/orders`}
                            className="text-blue-600 hover:underline font-medium">
                            {m.store._count.orders}
                          </Link>
                        ) : <span className="text-gray-400">{m.store?._count.orders ?? 0}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          m.planStatus === "SUSPENDED" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                        }`}>{m.planStatus}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500">
                        {m.trialEndsAt ? new Date(m.trialEndsAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        {m.emailVerified
                          ? <CheckCircle2 size={15} className="text-green-500" />
                          : <Clock size={15} className="text-amber-400" />
                        }
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/merchants/${m.id}`}
                            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                            View
                          </Link>
                          <button onClick={() => toggleStatus(m.id, m.planStatus)}
                            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                              m.planStatus === "SUSPENDED"
                                ? "bg-green-50 hover:bg-green-100 text-green-700"
                                : "bg-red-50 hover:bg-red-100 text-red-700"
                            }`}>
                            {m.planStatus === "SUSPENDED" ? "Activate" : "Suspend"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
