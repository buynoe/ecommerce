"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Check, Users, Pencil, Trash2, Plus, X, Star, ToggleLeft, ToggleRight, GripVertical,
} from "lucide-react";

interface Plan {
  id: string;
  key: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

const COLORS: Record<string, string> = {
  TRIAL: "#6366f1",
  BASIC: "#0891b2",
  PRO: "#ec1f78",
  ENTERPRISE: "#16a34a",
};
function planColor(key: string) {
  return COLORS[key] ?? "#6b7280";
}

const EMPTY_FORM = {
  key: "", name: "", price: "", description: "", features: [""], isPopular: false, isActive: true,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [plansRes, statsRes] = await Promise.all([
      fetch("/api/admin/plans"),
      fetch("/api/admin/stats"),
    ]);
    setPlans(await plansRes.json());
    const stats = await statsRes.json();
    setBreakdown(stats.planBreakdown ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(p: Plan) {
    setEditing(p);
    setCreating(false);
    setForm({
      key: p.key,
      name: p.name,
      price: (p.price / 100).toString(),
      description: p.description,
      features: p.features.length ? p.features : [""],
      isPopular: p.isPopular,
      isActive: p.isActive,
    });
    setError("");
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setError("");
  }

  function closeModal() {
    setEditing(null);
    setCreating(false);
    setError("");
  }

  function setFeature(i: number, val: string) {
    setForm(f => {
      const arr = [...f.features];
      arr[i] = val;
      return { ...f, features: arr };
    });
  }

  function addFeature() {
    setForm(f => ({ ...f, features: [...f.features, ""] }));
  }

  function removeFeature(i: number) {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  }

  async function save() {
    setError("");
    const price = parseFloat(form.price);
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (isNaN(price) || price < 0) { setError("Price must be a valid number"); return; }
    const features = form.features.filter(f => f.trim());

    setSaving(true);
    try {
      const body = { name: form.name, price, description: form.description, features, isPopular: form.isPopular, isActive: form.isActive };
      let res: Response;
      if (creating) {
        if (!form.key.trim()) { setError("Key is required"); setSaving(false); return; }
        res = await fetch("/api/admin/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, key: form.key.toUpperCase() }),
        });
      } else {
        res = await fetch(`/api/admin/plans/${editing!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Save failed"); }
      await load();
      closeModal();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p: Plan) {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    load();
  }

  async function deletePlan(p: Plan) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeleting(p.id);
    await fetch(`/api/admin/plans/${p.id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage pricing plans — changes reflect on the landing page immediately</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
        >
          <Plus size={15} /> New Plan
        </button>
      </div>

      {/* Distribution bar */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Merchant Distribution</h2>
          <div className="flex gap-1 h-8 rounded-xl overflow-hidden mb-4">
            {plans.map(p => {
              const count = breakdown[p.key] ?? 0;
              const w = (count / total) * 100;
              if (w === 0) return null;
              return (
                <div key={p.key} style={{ width: `${w}%`, background: planColor(p.key) }}
                  title={`${p.name}: ${count}`} className="flex items-center justify-center">
                  {w > 8 && <span className="text-white text-xs font-bold">{count}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4">
            {plans.map(p => (
              <div key={p.key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: planColor(p.key) }} />
                <span className="text-sm text-gray-600">{p.name}</span>
                <span className="text-sm font-bold text-gray-900">{breakdown[p.key] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading plans…</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map(p => {
            const color = planColor(p.key);
            const count = breakdown[p.key] ?? 0;
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  p.isActive ? "border-gray-100" : "border-gray-200 opacity-60"
                }`}
              >
                {/* Header */}
                <div className="px-5 py-4" style={{ background: `${color}10`, borderBottom: `2px solid ${color}20` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{p.key}</span>
                      {p.isPopular && <Star size={11} className="fill-amber-400 text-amber-400" />}
                      {!p.isActive && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Users size={11} /> {count}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {p.price === 0 ? "Free" : `₹${(p.price / 100).toLocaleString("en-IN")}`}
                  </div>
                  <div className="text-xs text-gray-500">{p.price === 0 ? "30-day trial" : "/month"}</div>
                  {p.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.description}</p>
                  )}
                </div>

                {/* Features */}
                <div className="px-5 py-4">
                  <ul className="space-y-1.5 mb-4">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                        <Check size={12} style={{ color }} className="shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg py-1.5 transition-colors"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={() => toggleActive(p)}
                      title={p.isActive ? "Deactivate" : "Activate"}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      {p.isActive ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => deletePlan(p)}
                      disabled={deleting === p.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Create Modal */}
      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {creating ? "New Plan" : `Edit "${editing!.name}"`}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              {creating && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Key <span className="text-red-500">*</span></label>
                  <input
                    value={form.key}
                    onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                    placeholder="e.g. STARTER"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 font-mono uppercase"
                  />
                  <p className="text-xs text-gray-400 mt-1">Unique identifier, uppercase, no spaces</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Pro"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹/month) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number" min="0" step="1"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="299"
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Enter 0 for a free/trial plan</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short tagline shown on pricing cards"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
                <div className="space-y-2">
                  {form.features.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <GripVertical size={14} className="text-gray-300 shrink-0" />
                      <input
                        value={feat}
                        onChange={e => setFeature(i, e.target.value)}
                        placeholder={`Feature ${i + 1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
                      />
                      <button
                        onClick={() => removeFeature(i)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addFeature}
                  className="mt-2 flex items-center gap-1.5 text-xs text-pink-600 hover:text-pink-700 font-medium"
                >
                  <Plus size={13} /> Add feature
                </button>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, isPopular: !f.isPopular }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.isPopular ? "bg-amber-400" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPopular ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Mark as Popular</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-700 font-medium">Active</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
              >
                {saving ? "Saving…" : creating ? "Create Plan" : "Save Changes"}
              </button>
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
