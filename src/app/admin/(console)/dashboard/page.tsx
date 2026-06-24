"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, IndianRupee, ShieldCheck, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#6366f1", BASIC: "#0891b2", PRO: "#ec1f78", ENTERPRISE: "#16a34a",
};

function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}

export default function AdminDashboard() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
  );

  const d = data as {
    totalMerchants: number; newThisMonth: number; newLastMonth: number;
    verifiedMerchants: number;
    planBreakdown: Record<string, number>;
    revenue: { total: number; thisMonth: number; lastMonth: number };
    recentMerchants: { id: string; name: string; email: string; plan: string; createdAt: string; emailVerified: boolean; store?: { name: string; slug: string } }[];
    recentTx: { id: string; invoiceNumber: string; plan: string; amount: number; status: string; createdAt: string; merchant: { name: string } }[];
  };

  const paidMerchants = (d.planBreakdown.BASIC ?? 0) + (d.planBreakdown.PRO ?? 0) + (d.planBreakdown.ENTERPRISE ?? 0);

  const STAT_CARDS = [
    { label: "Total Merchants", value: d.totalMerchants, sub: `+${d.newThisMonth} this month`, icon: Users, color: "#ec1f78", bg: "rgba(236,31,120,0.08)" },
    { label: "Total Revenue",  value: fmt(d.revenue.total), sub: `${fmt(d.revenue.thisMonth)} this month`, icon: IndianRupee, color: "#16a34a", bg: "rgba(22,163,74,0.08)" },
    { label: "Paid Merchants", value: paidMerchants, sub: pct(paidMerchants, d.totalMerchants) + " conversion", icon: TrendingUp, color: "#ff6e30", bg: "rgba(255,110,48,0.08)" },
    { label: "Email Verified", value: d.verifiedMerchants, sub: pct(d.verifiedMerchants, d.totalMerchants) + " of total", icon: ShieldCheck, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {STAT_CARDS.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</span>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon size={17} style={{ color: c.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{c.value}</div>
            <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Plan breakdown + Recent merchants */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Plan breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Plan Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(d.planBreakdown).map(([plan, count]) => (
              <div key={plan} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PLAN_COLORS[plan] }} />
                <span className="text-sm text-gray-700 flex-1">{plan}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct(count as number, d.totalMerchants), background: PLAN_COLORS[plan] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Signups</h2>
            <Link href="/admin/merchants" className="text-xs font-medium hover:underline" style={{ color: "#ec1f78" }}>View all →</Link>
          </div>
          <div className="space-y-2">
            {d.recentMerchants.map(m => (
              <Link key={m.id} href={`/admin/merchants/${m.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: PLAN_COLORS[m.plan] ?? "#6b7280" }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                  <div className="text-xs text-gray-400 truncate">{m.email}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                  style={{ background: `${PLAN_COLORS[m.plan]}18`, color: PLAN_COLORS[m.plan] }}>
                  {m.plan}
                </span>
                {m.emailVerified
                  ? <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                  : <Clock size={13} className="text-amber-400 shrink-0" />
                }
                <ArrowUpRight size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
          <Link href="/admin/payments" className="text-xs font-medium hover:underline" style={{ color: "#ec1f78" }}>View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Invoice", "Merchant", "Plan", "Amount", "Status", "Date"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {d.recentTx.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500">{tx.invoiceNumber}</td>
                  <td className="py-3 pr-4 text-gray-800 font-medium">{tx.merchant.name}</td>
                  <td className="py-3 pr-4">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${PLAN_COLORS[tx.plan]}18`, color: PLAN_COLORS[tx.plan] }}>
                      {tx.plan}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{fmt(tx.amount)}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      tx.status === "SUCCESS" ? "bg-green-50 text-green-700" :
                      tx.status === "FAILED"  ? "bg-red-50 text-red-700"   :
                      "bg-amber-50 text-amber-700"
                    }`}>{tx.status}</span>
                  </td>
                  <td className="py-3 text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {d.recentTx.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
