"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatDate } from "@/lib/utils";

interface Coupon { id: string; code: string; type: string; value: number; usedCount: number; maxUses?: number | null; endsAt?: string | null; isActive: boolean; minAmount?: number | null }

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", type: "PERCENTAGE", value: "", minAmount: "", maxUses: "", maxUsesPerCustomer: "1", endsAt: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await fetch("/api/coupons"); const d = await r.json();
    setCoupons(d.coupons || []); setLoading(false);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, value: parseFloat(form.value), minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined, maxUses: form.maxUses ? parseInt(form.maxUses) : undefined, maxUsesPerCustomer: parseInt(form.maxUsesPerCustomer) }) });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    setShowForm(false); load();
  }

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Coupon codes for customers"
        action={<button onClick={() => setShowForm(true)} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Create Coupon</button>}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create Coupon</h2>
            <form onSubmit={create} className="space-y-3">
              <input required placeholder="Coupon code (e.g. SAVE20)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="PERCENTAGE">Percentage %</option>
                  <option value="FLAT">Flat ₹</option>
                  <option value="FREE_SHIPPING">Free Shipping</option>
                  <option value="FIRST_ORDER">First Order</option>
                </select>
                <input required type="number" placeholder="Value" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <input type="number" placeholder="Min order ₹ (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Total max uses" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
                <input type="number" placeholder="Per customer limit" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.maxUsesPerCustomer} onChange={e => setForm(f => ({ ...f, maxUsesPerCustomer: e.target.value }))} />
              </div>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.endsAt} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium">Create Coupon</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading…</div>
          : coupons.length === 0 ? <div className="p-16 text-center text-gray-400"><div className="mb-3 flex justify-center"><svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg></div>No coupons yet</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Code", "Type", "Value", "Min Order", "Used", "Expires", "Status"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4"><span className="font-mono text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.type}</td>
                    <td className="px-6 py-4 text-sm">{c.type === "PERCENTAGE" ? `${c.value}%` : c.type === "FLAT" ? `₹${c.value}` : "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.minAmount ? `₹${c.minAmount}` : "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{c.endsAt ? formatDate(c.endsAt) : "No expiry"}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{c.isActive ? "Active" : "Inactive"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
