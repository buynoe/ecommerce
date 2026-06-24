"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Category = any;

const EMPTY_FORM = { name: "", description: "", imageUrl: "", isActive: true };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/categories");
    const d = await r.json();
    setCategories(d.categories || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); }
  function openEdit(cat: Category) { setEditing(cat); setForm({ name: cat.name, description: cat.description || "", imageUrl: cat.imageUrl || "", isActive: cat.isActive }); setError(""); setShowModal(true); }

  async function save() {
    if (!form.name.trim()) { setError("Category name is required"); return; }
    setSaving(true); setError("");
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    } else {
      const r = await fetch("/api/categories", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error); setSaving(false); return; }
    }
    await load();
    setShowModal(false);
    setSaving(false);
  }

  async function toggleActive(cat: Category) {
    await fetch(`/api/categories/${cat.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    await load();
  }

  async function del(cat: Category) {
    if (!confirm(`Delete "${cat.name}"? Products in this category will be unlinked.`)) return;
    await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Product Categories" subtitle="Organise your products into categories"
        action={
          <button onClick={openNew} className="btn-brand px-4 py-2.5 rounded-xl text-sm font-semibold">
            + New Category
          </button>
        }
      />

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No categories yet</h2>
          <p className="text-gray-400 text-sm mb-6">Create categories to organise your products and help customers browse easily</p>
          <button onClick={openNew} className="btn-brand px-6 py-3 rounded-xl font-semibold">
            Create First Category
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Products</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-lg">🏷️</div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-400 truncate max-w-xs">{cat.description}</p>}
                        <p className="text-xs text-gray-400 font-mono mt-0.5">/category/{cat.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{cat._count?.products ?? 0} products</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cat.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => toggleActive(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                        {cat.isActive ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => openEdit(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100">
                        Edit
                      </button>
                      <button onClick={() => del(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-900 text-lg">{editing ? "Edit Category" : "New Category"}</h2>
                <button onClick={() => setShowModal(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Clothing, Electronics…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    placeholder="Brief description of this category…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL <span className="text-xs text-gray-400">(optional)</span></label>
                  <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none" />
                </div>
                {editing && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 text-[#ec1f78] rounded" />
                    <span className="text-sm text-gray-700">Active (visible to customers)</span>
                  </label>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={save} disabled={saving}
                    className="flex-1 btn-brand py-3 rounded-xl font-bold disabled:opacity-50">
                    {saving ? "Saving…" : (editing ? "Update Category" : "Create Category")}
                  </button>
                  <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
