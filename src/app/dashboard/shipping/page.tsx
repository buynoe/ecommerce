"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ShippingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [methods, setMethods] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "STANDARD", price: "", minDays: "3", maxDays: "7" });

  useEffect(() => { load(); }, []);
  async function load() { const r = await fetch("/api/shipping"); const d = await r.json(); setMethods(d.methods || []); setProviders(d.providers || []); setLoading(false); }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/shipping", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: parseFloat(form.price), minDays: parseInt(form.minDays), maxDays: parseInt(form.maxDays) }) });
    setShowForm(false); load();
  }

  return (
    <div>
      <PageHeader title="Shipping" subtitle="Configure shipping methods and courier integrations"
        action={<button onClick={() => setShowForm(true)} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Add Method</button>}
      />

      {/* Providers */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Courier Partners</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {providers.map((p: { id: string; name: string }) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:border-green-300 hover:shadow-sm transition-all">
              <div className="text-2xl mb-1">🚚</div>
              <div className="text-xs font-semibold text-gray-700">{p.name}</div>
              <div className="text-xs link-brand mt-1 font-medium">Available</div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add Shipping Method</h2>
            <form onSubmit={create} className="space-y-3">
              <input required placeholder="Method name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="STANDARD">Standard</option>
                <option value="EXPRESS">Express</option>
                <option value="SAME_DAY">Same Day</option>
                <option value="COD">Cash on Delivery</option>
              </select>
              <input required type="number" min="0" step="0.01" placeholder="Price ₹" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" min="0" placeholder="Min days" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.minDays} onChange={e => setForm(f => ({ ...f, minDays: e.target.value }))} />
                <input type="number" min="0" placeholder="Max days" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.maxDays} onChange={e => setForm(f => ({ ...f, maxDays: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium">Add Method</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div>
          : methods.length === 0 ? <div className="p-12 text-center text-gray-400">No shipping methods configured</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>{["Method", "Type", "Price", "Delivery", "Status"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {methods.map((m: { id: string; name: string; type: string; price: number; minDays: number; maxDays: number; isActive: boolean }) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{m.type}</td>
                    <td className="px-6 py-4 text-sm">{m.price === 0 ? <span className="text-[#ec1f78] font-medium">Free</span> : formatCurrency(m.price)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{m.minDays}–{m.maxDays} days</td>
                    <td className="px-6 py-4"><span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${m.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{m.isActive ? "Active" : "Inactive"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
