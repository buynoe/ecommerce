"use client";
import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/types";
import Link from "next/link";

interface Analytics { stats: { totalRevenue: number; totalOrders: number; totalCustomers: number; totalProducts: number }; salesChart: { date: string; revenue: number; orders: number }[]; lowStock: { variant: { product: { title: string }; title: string }; available: number }[]; recentOrders: { id: string; orderNumber: string; email: string; total: number; status: string; createdAt: string }[]; topProducts: { product: { title: string } | null; _sum: { quantity: number | null; total: number | null } }[] }

const BRAND = "linear-gradient(90deg,#ec1f78,#ff6e30)";
const BRAND_COLOR = "#ec1f78";

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => { fetch("/api/analytics?days=30").then(r => r.json()).then(setData); }, []);

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard…</div>;

  const maxRev = Math.max(...data.salesChart.map(d => d.revenue), 1);

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
        <StatCard label="Total Revenue" value={formatCurrency(data.stats.totalRevenue)} icon="💰" color="pink" />
        <StatCard label="Orders" value={data.stats.totalOrders} icon="🛍️" color="orange" />
        <StatCard label="Customers" value={data.stats.totalCustomers} icon="👥" color="blue" />
        <StatCard label="Active Products" value={data.stats.totalProducts} icon="📦" color="purple" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue (30 days)</h2>
          <div className="flex items-end gap-1 h-40">
            {data.salesChart.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                  {d.date}: {formatCurrency(d.revenue)}
                </div>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${Math.max((d.revenue / maxRev) * 100, d.revenue > 0 ? 4 : 1)}%`,
                    background: d.revenue > 0 ? BRAND : "#f3f4f6",
                  }}
                />
                {i % 5 === 0 && <div className="text-xs text-gray-400 leading-none">{d.date.split(" ")[0]}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
            <Link href="/dashboard/inventory" className="text-xs font-medium hover:underline" style={{ color: BRAND_COLOR }}>View all</Link>
          </div>
          {data.lowStock.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">All items well stocked 🎉</p>
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
