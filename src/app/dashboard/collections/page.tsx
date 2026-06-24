"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

interface Collection { id: string; title: string; handle: string; type: string; status: string; _count: { products: number } }

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "MANUAL", status: "ACTIVE" });

  useEffect(() => { load(); }, []);
  async function load() { const r = await fetch("/api/collections"); const d = await r.json(); setCollections(d.collections || []); setLoading(false); }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setShowForm(false); load();
  }

  return (
    <div>
      <PageHeader title="Collections" subtitle="Group products into collections"
        action={<button onClick={() => setShowForm(true)} className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Create Collection</button>}
      />
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create Collection</h2>
            <form onSubmit={create} className="space-y-3">
              <input required placeholder="Collection name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <textarea rows={2} placeholder="Description (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="MANUAL">Manual</option>
                  <option value="AUTOMATED">Automated</option>
                </select>
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" className="flex-1 btn-brand rounded-lg py-2 text-sm font-medium">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 p-12 text-center text-gray-400">Loading…</div>
          : collections.length === 0 ? <div className="col-span-3 p-16 text-center text-gray-400"><div className="text-4xl mb-3">🗂️</div>No collections yet</div>
          : collections.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.type === "AUTOMATED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{c.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
              </div>
              <h3 className="font-semibold text-gray-900">{c.title}</h3>
              <p className="text-xs text-gray-400 mt-1">/collections/{c.handle}</p>
              <p className="text-sm text-gray-500 mt-3">{c._count.products} products</p>
            </div>
          ))}
      </div>
    </div>
  );
}
