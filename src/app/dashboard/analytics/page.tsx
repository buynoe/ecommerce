"use client";
import { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, BarChart2, Package, Trophy, AlertTriangle, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/utils";

interface ChartDay { date: string; revenue: number; orders: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Analytics = any;

function BarChart({ data, metric, color }: { data: ChartDay[]; metric: "revenue" | "orders"; color: string }) {
  const values = data.map(d => d[metric]);
  const max = Math.max(...values, 0);
  const hasData = max > 0;

  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 48 48"><rect x="4" y="28" width="8" height="16" rx="2" fill="currentColor" opacity="0.3" /><rect x="16" y="20" width="8" height="24" rx="2" fill="currentColor" opacity="0.3" /><rect x="28" y="12" width="8" height="32" rx="2" fill="currentColor" opacity="0.3" /><rect x="40" y="6" width="4" height="38" rx="2" fill="currentColor" opacity="0.3" /></svg>
        <p className="text-sm font-medium text-gray-400">No data for this period</p>
        <p className="text-xs text-gray-300">Place some orders to see your chart</p>
      </div>
    );
  }

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f).reverse();

  return (
    <div className="flex gap-3 h-52">
      {/* Y axis */}
      <div className="flex flex-col justify-between text-right pr-1 shrink-0 pb-5">
        {ticks.map((v, i) => (
          <span key={i} className="text-xs text-gray-400 leading-none">
            {metric === "revenue" ? `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}` : v.toFixed(0)}
          </span>
        ))}
      </div>

      {/* Bars */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-end gap-0.5 relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {ticks.map((_, i) => <div key={i} className="border-t border-gray-100 w-full" />)}
          </div>
          {data.map((d, i) => {
            const pct = max > 0 ? (d[metric] / max) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                  <div className="font-semibold">{d.date}</div>
                  <div>{metric === "revenue" ? formatCurrency(d.revenue) : `${d.orders} orders`}</div>
                </div>
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 cursor-pointer ${color} hover:opacity-80`}
                  style={{ height: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                />
              </div>
            );
          })}
        </div>
        {/* X axis labels — only show every Nth */}
        <div className="flex gap-0.5 h-5 mt-1">
          {data.map((d, i) => {
            const step = Math.max(1, Math.floor(data.length / 8));
            return (
              <div key={i} className="flex-1 flex items-center justify-center">
                {i % step === 0 && (
                  <span className="text-xs text-gray-400 leading-none" style={{ fontSize: "9px" }}>
                    {d.date.slice(5)} {/* MM-DD */}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function toISODate(d: Date) { return d.toISOString().split("T")[0]; }

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [fromDate, setFromDate] = useState(() => toISODate(new Date(Date.now() - 30 * 86400000)));
  const [toDate, setToDate] = useState(() => toISODate(new Date()));
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (rangeMode === "custom") {
      params.set("from", fromDate);
      params.set("to", toDate);
    } else {
      params.set("days", String(days));
    }
    fetch(`/api/analytics?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days, rangeMode, fromDate, toDate]);

  if (loading || !data) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <svg className="animate-spin w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        Loading analytics…
      </div>
    </div>
  );

  const totalRevenue: number = data.stats.totalRevenue || 0;
  const totalOrders: number = data.stats.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const convRate = data.stats.totalCustomers > 0 ? ((totalOrders / data.stats.totalCustomers) * 100).toFixed(1) : "0";

  const subtitle = rangeMode === "custom"
    ? `${fromDate} → ${toDate}`
    : `Last ${days} days`;

  return (
    <div>
      <PageHeader title="Analytics & Reports" subtitle={subtitle}
        action={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Preset tabs */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => { setDays(d); setRangeMode("preset"); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${rangeMode === "preset" && days === d ? "btn-brand" : "text-gray-600 hover:bg-gray-50"}`}>
                  {d}d
                </button>
              ))}
              <button onClick={() => setRangeMode("custom")}
                className={`px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${rangeMode === "custom" ? "btn-brand" : "text-gray-600 hover:bg-gray-50"}`}>
                Custom
              </button>
            </div>
            {/* Custom date range */}
            {rangeMode === "custom" && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={fromDate} max={toDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500" />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" value={toDate} min={fromDate} max={toISODate(new Date())}
                  onChange={e => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500" />
              </div>
            )}
          </div>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="w-5 h-5" />} color="green" />
        <StatCard label="Total Orders" value={totalOrders} icon={<ShoppingBag className="w-5 h-5" />} color="blue" />
        <StatCard label="Avg Order Value" value={formatCurrency(avgOrderValue)} icon={<BarChart2 className="w-5 h-5" />} color="purple" />
        <StatCard label="Active Products" value={data.stats.totalProducts} icon={<Package className="w-5 h-5" />} color="orange" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-gray-900">{data.stats.totalCustomers}</p>
          <p className="text-xs text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Orders / Customer</p>
          <p className="text-2xl font-bold text-gray-900">{convRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Conversion rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue Today</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(data.salesChart[data.salesChart.length - 1]?.revenue || 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Today's earnings</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Orders Today</p>
          <p className="text-2xl font-bold text-gray-900">{data.salesChart[data.salesChart.length - 1]?.orders || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Today's orders</p>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-900">
            {chartMetric === "revenue" ? "Revenue Trend" : "Orders Trend"} ({days} days)
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button onClick={() => setChartMetric("revenue")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartMetric === "revenue" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Revenue
            </button>
            <button onClick={() => setChartMetric("orders")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${chartMetric === "orders" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              Orders
            </button>
          </div>
        </div>
        <BarChart
          data={data.salesChart}
          metric={chartMetric}
          color={chartMetric === "revenue" ? "bg-green-500" : "bg-blue-500"}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500" /> Top Selling Products</h2>
            <span className="text-xs text-gray-400">By revenue</span>
          </div>
          {data.topProducts.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Package className="w-10 h-10 mb-2 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">No sales yet in this period</p>
              <p className="text-xs text-gray-300 mt-1">Orders will appear here once placed</p>
            </div>
          ) : data.topProducts.map((tp: { product: { title: string } | null; _sum: { quantity: number | null; total: number | null } }, i: number) => {
            const pct = data.topProducts[0]._sum.total > 0 ? ((tp._sum.total || 0) / data.topProducts[0]._sum.total) * 100 : 0;
            return (
              <div key={i} className="px-6 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{i + 1}</span>
                    <span className="text-sm font-medium text-gray-900 truncate">{tp.product?.title || "Unknown"}</span>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm font-bold text-gray-900">{formatCurrency(tp._sum.total || 0)}</div>
                    <div className="text-xs text-gray-400">{tp._sum.quantity || 0} units</div>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alert</h2>
            <span className="text-xs text-gray-400">≤5 units</span>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="w-10 h-10 mb-2 text-green-400 mx-auto" />
              <p className="text-sm text-gray-500 font-medium">All products well stocked!</p>
              <p className="text-xs text-gray-400 mt-1">You&apos;re good to go</p>
            </div>
          ) : data.lowStock.map((item: { variant: { id: string; title: string; product: { title: string } }; available: number }, i: number) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.variant.product.title}</p>
                <p className="text-xs text-gray-400">{item.variant.title}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-3 ${item.available === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {item.available === 0 ? "Out of stock" : `${item.available} left`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue breakdown by status */}
      {data.revenueByStatus && Object.keys(data.revenueByStatus).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Revenue by Order Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.revenueByStatus as Record<string, number>).map(([status, rev]) => (
              <div key={status} className="text-center bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{status.replace("_", " ")}</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(rev)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
