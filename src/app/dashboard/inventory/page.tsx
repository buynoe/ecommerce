"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function InventoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adjForm, setAdjForm] = useState({ quantity: "", action: "ADJUSTMENT", reason: "" });

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await fetch("/api/inventory");
    const d = await r.json();
    setVariants(d.variants || []);
    setLoading(false);
  }

  async function adjust(variantId: string) {
    await fetch("/api/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId, quantity: parseInt(adjForm.quantity), action: adjForm.action, reason: adjForm.reason }),
    });
    setAdjusting(null);
    setAdjForm({ quantity: "", action: "ADJUSTMENT", reason: "" });
    load();
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage stock levels across all products" />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading…</div>
          : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Product", "Variant / SKU", "Available", "Reserved", "Low Alert", ""].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variants.map(v => (
                  <>
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {v.product.images?.[0] && <img src={v.product.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
                          <span className="text-sm font-medium text-gray-900">{v.product.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{v.title} {v.sku && <span className="text-xs text-gray-400">({v.sku})</span>}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${(v.inventoryItem?.available || 0) <= (v.inventoryItem?.lowStockAlert || 5) ? "text-red-600" : "text-gray-900"}`}>
                          {v.inventoryItem?.available ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{v.inventoryItem?.reserved ?? 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{v.inventoryItem?.lowStockAlert ?? 5}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => setAdjusting(v.id)} className="text-xs link-brand font-medium hover:underline">Adjust</button>
                      </td>
                    </tr>
                    {adjusting === v.id && (
                      <tr key={`${v.id}-adj`} className="bg-green-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex items-end gap-3">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Quantity (+ add / - remove)</label>
                              <input type="number" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none"
                                value={adjForm.quantity} onChange={e => setAdjForm(f => ({ ...f, quantity: e.target.value }))} />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Action</label>
                              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                value={adjForm.action} onChange={e => setAdjForm(f => ({ ...f, action: e.target.value }))}>
                                <option value="ADJUSTMENT">Adjustment</option>
                                <option value="RECEIVE">Receive Stock</option>
                                <option value="RETURN">Return</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 block mb-1">Reason</label>
                              <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))} placeholder="Optional reason" />
                            </div>
                            <button onClick={() => adjust(v.id)} className="btn-brand px-4 py-1.5 rounded-lg text-sm font-medium">Save</button>
                            <button onClick={() => setAdjusting(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
