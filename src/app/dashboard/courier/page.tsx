"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

interface CourierAccount {
  id: string; provider: string; name: string; apiKey?: string; apiSecret?: string;
  clientId?: string; username?: string; password?: string; channelId?: string;
  warehousePincode?: string; isActive: boolean; isDefault: boolean; createdAt: string;
}

const PROVIDERS = [
  {
    id: "SHIPROCKET", name: "Shiprocket", logo: "🚀", color: "bg-orange-500",
    desc: "India's largest eCommerce shipping solution. Integrates 25+ couriers.",
    fields: ["email (username)", "password", "channelId (optional)"],
    docsUrl: "https://apidocs.shiprocket.in/",
    fieldKeys: ["username", "password", "channelId"],
    fieldLabels: ["Email / Username", "Password", "Channel ID (optional)"],
  },
  {
    id: "DELHIVERY", name: "Delhivery", logo: "📦", color: "bg-red-500",
    desc: "India's fastest growing fully-integrated logistics services company.",
    fields: ["API Token"],
    docsUrl: "https://www.delhivery.com/",
    fieldKeys: ["apiKey"],
    fieldLabels: ["API Token"],
  },
  {
    id: "DTDC", name: "DTDC", logo: "🔴", color: "bg-red-600",
    desc: "Premium courier service with pan-India coverage.",
    fields: ["Client ID", "API Key"],
    docsUrl: "https://dtdc.com/",
    fieldKeys: ["clientId", "apiKey"],
    fieldLabels: ["Client ID", "API Key"],
  },
  {
    id: "BLUEDART", name: "BlueDart", logo: "🔵", color: "bg-blue-600",
    desc: "South Asia's leading courier delivery services company.",
    fields: ["Client ID", "API Key", "API Secret"],
    docsUrl: "https://www.bluedart.com/",
    fieldKeys: ["clientId", "apiKey", "apiSecret"],
    fieldLabels: ["Client ID", "API Key", "API Secret"],
  },
  {
    id: "ECOMEXPRESS", name: "Ecom Express", logo: "🟢", color: "bg-brand-gradient",
    desc: "Technology-driven end-to-end logistics solutions provider.",
    fields: ["Username", "Password"],
    docsUrl: "https://ecomexpress.in/",
    fieldKeys: ["username", "password"],
    fieldLabels: ["Username", "Password"],
  },
  {
    id: "XPRESSBEES", name: "Xpressbees", logo: "🐝", color: "bg-yellow-500",
    desc: "Fastest delivery partner in India with AI-driven logistics.",
    fields: ["Username", "Password"],
    docsUrl: "https://www.xpressbees.com/",
    fieldKeys: ["username", "password"],
    fieldLabels: ["Username", "Password"],
  },
];

const emptyForm = () => ({ provider: "", name: "", apiKey: "", apiSecret: "", clientId: "", username: "", password: "", channelId: "", warehousePincode: "", isDefault: false });

export default function CourierPage() {
  const [accounts, setAccounts] = useState<CourierAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/courier-accounts");
    const d = await r.json();
    setAccounts(d.accounts || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function openAdd(providerId: string) {
    const p = PROVIDERS.find(p => p.id === providerId)!;
    setForm({ ...emptyForm(), provider: providerId, name: p.name });
    setAddingProvider(providerId);
    setEditId(null);
  }

  function openEdit(account: CourierAccount) {
    setForm({
      provider: account.provider,
      name: account.name,
      apiKey: account.apiKey || "",
      apiSecret: account.apiSecret || "",
      clientId: account.clientId || "",
      username: account.username || "",
      password: account.password || "",
      channelId: account.channelId || "",
      warehousePincode: account.warehousePincode || "",
      isDefault: account.isDefault,
    });
    setAddingProvider(account.provider);
    setEditId(account.id);
  }

  async function save() {
    setSaving(true);
    const url = editId ? `/api/courier-accounts/${editId}` : "/api/courier-accounts";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setAddingProvider(null);
    setEditId(null);
    load();
  }

  async function toggle(account: CourierAccount) {
    await fetch(`/api/courier-accounts/${account.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !account.isActive }),
    });
    load();
  }

  async function setDefault(account: CourierAccount) {
    await fetch(`/api/courier-accounts/${account.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this courier account?")) return;
    await fetch(`/api/courier-accounts/${id}`, { method: "DELETE" });
    load();
  }

  const activeProv = PROVIDERS.find(p => p.id === addingProvider);
  const connectedProviders = accounts.map(a => a.provider);

  return (
    <div>
      <PageHeader title="Courier Partners" subtitle="Connect delivery partners to ship your orders" />

      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Connected Partners</h2>
          <div className="space-y-3">
            {accounts.map(account => {
              const prov = PROVIDERS.find(p => p.id === account.provider);
              return (
                <div key={account.id} className={`bg-white rounded-xl border overflow-hidden ${account.isActive ? "border-gray-200" : "border-gray-100 opacity-70"}`}>
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${prov?.color || "bg-gray-400"} rounded-xl flex items-center justify-center text-2xl text-white`}>
                        {prov?.logo || "📦"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900">{account.name}</p>
                          {account.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Default</span>}
                          {!account.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Paused</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{prov?.desc}</p>
                        {account.warehousePincode && <p className="text-xs text-gray-500 mt-0.5">📍 Pickup PIN: {account.warehousePincode}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!account.isDefault && (
                        <button onClick={() => setDefault(account)} className="text-xs px-3 py-1.5 rounded-lg border border-green-200 text-[#ec1f78] hover:bg-green-50 font-medium">
                          Set Default
                        </button>
                      )}
                      <button onClick={() => toggle(account)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                        {account.isActive ? "Pause" : "Activate"}
                      </button>
                      <button onClick={() => openEdit(account)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                        ✏️ Edit
                      </button>
                      <button onClick={() => remove(account.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available providers */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
        {accounts.length > 0 ? "Add Another Partner" : "Choose Your Delivery Partner"}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(prov => {
          const isConnected = connectedProviders.includes(prov.id);
          return (
            <div key={prov.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 ${prov.color} rounded-xl flex items-center justify-center text-2xl text-white shrink-0`}>{prov.logo}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{prov.name}</h3>
                    {isConnected && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Connected</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{prov.desc}</p>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Requires: <span className="text-gray-600">{prov.fields.join(", ")}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openAdd(prov.id)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${isConnected ? "border-green-200 text-[#ec1f78] hover:bg-green-50" : "btn-brand"}`}>
                  {isConnected ? "+ Add Another" : "Connect"}
                </button>
                <a href={prov.docsUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Docs ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-bold text-blue-900 mb-3">⚙️ How Courier Integration Works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-blue-800">
          <div><span className="font-semibold">1. Connect API Credentials</span><p className="text-blue-600 text-xs mt-1">Enter your courier account credentials here. Your keys are encrypted and stored securely.</p></div>
          <div><span className="font-semibold">2. Create Shipment from Orders</span><p className="text-blue-600 text-xs mt-1">In each order detail page, click "Create Shipment" to book a pickup via your connected courier.</p></div>
          <div><span className="font-semibold">3. Track & Notify Customers</span><p className="text-blue-600 text-xs mt-1">AWB/tracking number is auto-filled. Customer gets tracking link in their account and emails.</p></div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {addingProvider && activeProv && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${activeProv.color} rounded-xl flex items-center justify-center text-xl text-white`}>{activeProv.logo}</div>
                <div>
                  <h2 className="font-bold text-gray-900">{editId ? "Edit" : "Connect"} {activeProv.name}</h2>
                  <p className="text-xs text-gray-500">Enter your {activeProv.name} API credentials</p>
                </div>
              </div>
              <button onClick={() => setAddingProvider(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Display Name</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={activeProv.name} />
              </div>

              {activeProv.fieldKeys.map((key, i) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{activeProv.fieldLabels[i]}</label>
                  <input
                    type={key === "password" || key === "apiSecret" ? "password" : "text"}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none font-mono"
                    value={(form as unknown as Record<string, string>)[key] || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={key.includes("secret") || key.includes("password") ? "•••••••••••" : "Enter " + activeProv.fieldLabels[i]}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Warehouse / Pickup Pincode</label>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  value={form.warehousePincode} onChange={e => setForm(f => ({ ...f, warehousePincode: e.target.value }))}
                  placeholder="400001" maxLength={6} inputMode="numeric" />
                <p className="text-xs text-gray-400 mt-1">Used as pickup location when creating shipments</p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} className="w-4 h-4 text-[#ec1f78]" />
                <span className="text-sm font-medium text-gray-700">Set as default courier for new orders</span>
              </label>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                🔐 Your credentials are encrypted before storage. We recommend using test/sandbox keys first to verify the connection.
              </div>

              <div className="flex gap-3">
                <button onClick={save} disabled={saving} className="flex-1 btn-brand py-3 rounded-xl font-bold disabled:opacity-50">
                  {saving ? "Saving…" : editId ? "Save Changes" : `Connect ${activeProv.name}`}
                </button>
                <button onClick={() => setAddingProvider(null)} className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
