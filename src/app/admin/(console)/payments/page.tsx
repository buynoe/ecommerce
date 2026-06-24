"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, IndianRupee, TrendingUp, XCircle } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#6366f1", BASIC: "#0891b2", PRO: "#ec1f78", ENTERPRISE: "#16a34a",
};
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

type Tx = {
  id: string; invoiceNumber: string; plan: string; amount: number;
  status: string; createdAt: string;
  merchant: { name: string; email: string };
};
type Totals = { status: string; _sum: { amount: number }; _count: number }[];

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [totals, setTotals]   = useState<Totals>([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [q, setQ]             = useState("");
  const [status, setStatus]   = useState("");
  const [plan, setPlan]       = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pg = page) => {
    setLoading(true);
    const params = new URLSearchParams({ q, status, plan, page: String(pg) });
    const res = await fetch(`/api/admin/payments?${params}`);
    const d = await res.json();
    setTransactions(d.transactions ?? []);
    setTotals(d.totals ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }, [q, status, plan, page]);

  useEffect(() => { setPage(1); }, [q, status, plan]);
  useEffect(() => { load(page); }, [page, q, status, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  const successTotal  = totals.find(t => t.status === "SUCCESS");
  const failedCount   = totals.find(t => t.status === "FAILED")?._count ?? 0;
  const refundedTotal = totals.find(t => t.status === "REFUNDED");

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} total transactions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-3">
            <IndianRupee size={14} /> Total Revenue
          </div>
          <div className="text-2xl font-bold text-gray-900">{fmt(successTotal?._sum.amount ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-1">{successTotal?._count ?? 0} successful transactions</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-3">
            <XCircle size={14} /> Failed
          </div>
          <div className="text-2xl font-bold text-gray-900">{failedCount}</div>
          <div className="text-xs text-gray-400 mt-1">failed transactions</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-3">
            <TrendingUp size={14} /> Refunded
          </div>
          <div className="text-2xl font-bold text-gray-900">{fmt(refundedTotal?._sum.amount ?? 0)}</div>
          <div className="text-xs text-gray-400 mt-1">{refundedTotal?._count ?? 0} refunded</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by merchant or invoice…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
          <option value="">All Status</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select value={plan} onChange={e => setPlan(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
          <option value="">All Plans</option>
          {["BASIC", "PRO", "ENTERPRISE"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Invoice", "Merchant", "Plan", "Amount", "Status", "Date"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3.5 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">Loading…</td></tr>
                : transactions.length === 0
                  ? <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No transactions found</td></tr>
                  : transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{tx.invoiceNumber}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{tx.merchant.name}</div>
                        <div className="text-xs text-gray-400">{tx.merchant.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                          style={{ background: `${PLAN_COLORS[tx.plan]}18`, color: PLAN_COLORS[tx.plan] }}>
                          {tx.plan}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">{fmt(tx.amount)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tx.status === "SUCCESS" ? "bg-green-50 text-green-700" :
                          tx.status === "FAILED"  ? "bg-red-50 text-red-700"    : "bg-amber-50 text-amber-700"
                        }`}>{tx.status}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
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
