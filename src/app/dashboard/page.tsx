"use client";
import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/types";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface Analytics {
  stats: { totalRevenue: number; totalOrders: number; totalCustomers: number; totalProducts: number };
  salesChart: { date: string; revenue: number; orders: number }[];
  lowStock: { variant: { product: { title: string }; title: string }; available: number }[];
  recentOrders: { id: string; orderNumber: string; email: string; total: number; status: string; createdAt: string }[];
  topProducts: { product: { title: string } | null; _sum: { quantity: number | null; total: number | null } }[];
}

const BRAND = "linear-gradient(90deg,#ec1f78,#ff6e30)";
const BRAND_COLOR = "#ec1f78";

const IconRevenue = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const IconOrders = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconCustomers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconProducts = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.name === "Revenue" ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => { fetch("/api/analytics?days=30").then(r => r.json()).then(setData); }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard…</div>;

  const chartData = data.salesChart.map(d => ({
    date: d.date.replace(/\d{4}/, "").trim(),
    Revenue: d.revenue,
    Orders: d.orders,
  }));

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Last 30 days performance"
        action={
          <Link
            href="/dashboard/orders"
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: BRAND }}
          >
            View All Orders
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Revenue" value={formatCurrency(data.stats.totalRevenue)} icon={<IconRevenue />} color="pink" />
        <StatCard label="Orders" value={data.stats.totalOrders} icon={<IconOrders />} color="orange" />
        <StatCard label="Customers" value={data.stats.totalCustomers} icon={<IconCustomers />} color="blue" />
        <StatCard label="Active Products" value={data.stats.totalProducts} icon={<IconProducts />} color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue & Orders (30 days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec1f78" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#ec1f78" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6e30" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#ff6e30" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4}/>
              <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} width={40}/>
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={30}/>
              <Tooltip content={<CustomTooltip />}/>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}/>
              <Area yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#ec1f78" strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }}/>
              <Area yAxisId="ord" type="monotone" dataKey="Orders" stroke="#ff6e30" strokeWidth={2} fill="url(#ordGrad)" dot={false} activeDot={{ r: 4 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link href="/dashboard/inventory" className="text-xs font-medium hover:underline" style={{ color: BRAND_COLOR }}>View all</Link>
          </div>
          {data.lowStock.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">All items well stocked</p>
            : data.lowStock.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{item.variant.product.title}</p>
                  <p className="text-xs text-gray-400">{item.variant.title}</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{item.available} left</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Orders Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Daily Orders (30 days)</h2>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={4}/>
            <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} width={24}/>
            <Tooltip content={<CustomTooltip />}/>
            <Bar dataKey="Orders" fill="#ff6e30" radius={[3, 3, 0, 0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/dashboard/orders" className="text-xs font-medium hover:underline" style={{ color: BRAND_COLOR }}>View all</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {data.recentOrders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link href={`/dashboard/orders/${o.id}`} className="text-sm font-medium hover:underline" style={{ color: BRAND_COLOR }}>{o.orderNumber}</Link>
                    <p className="text-xs text-gray-400">{o.email}</p>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-right">{formatCurrency(o.total)}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[o.status] || "bg-gray-100 text-gray-600"}`}>
                      {ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 text-sm">No orders yet</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Top Products</h2>
            <Link href="/dashboard/analytics" className="text-xs font-medium hover:underline" style={{ color: BRAND_COLOR }}>View report</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topProducts.map((tp, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[180px]">{tp.product?.title || "Unknown"}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">{formatCurrency(tp._sum.total || 0)}</div>
                  <div className="text-xs text-gray-400">{tp._sum.quantity} sold</div>
                </div>
              </div>
            ))}
            {data.topProducts.length === 0 && <div className="px-6 py-8 text-center text-gray-400 text-sm">No sales yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
