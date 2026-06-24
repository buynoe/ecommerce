"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/dashboard/PageHeader";
import GalleryWidget from "@/components/ui/GalleryWidget";
import {
  Store, Package, Mail, Image as ImageIcon, Briefcase, CheckCircle, AlertCircle,
} from "lucide-react";

type Tab = "general" | "orders" | "email" | "media" | "business";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "general",  label: "General",  icon: Store },
  { id: "orders",   label: "Orders",   icon: Package },
  { id: "email",    label: "Email",    icon: Mail },
  { id: "media",    label: "Media",    icon: ImageIcon },
  { id: "business", label: "Business", icon: Briefcase },
];

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none";

type Msg = { ok: boolean; text: string } | null;

function SaveBar({ saving, msg, onClear }: { saving: boolean; msg: Msg; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
      <div>
        {msg && (
          <span className={`flex items-center gap-1.5 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>
            {msg.ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </span>
        )}
      </div>
      <button type="submit" disabled={saving}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [merchant, setMerchant] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("general");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [showLogoGallery, setShowLogoGallery] = useState(false);

  useEffect(() => {
    fetch("/api/store/settings").then(r => r.json()).then(d => { setStore(d.store); setMerchant(d.merchant); });
  }, []);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    if (ok) setTimeout(() => setMsg(null), 3000);
  }

  async function saveStore(fields: Record<string, unknown>) {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/store/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = await r.json().catch(() => ({}));
      setSaving(false);
      if (r.ok) flash(true, "Saved successfully");
      else flash(false, data.error || `Server error (${r.status})`);
    } catch {
      setSaving(false);
      flash(false, "Network error — please check your connection.");
    }
  }

  async function saveMerchant(fields: Record<string, unknown>) {
    return saveStore(fields);
  }

  if (!store) return <div className="p-12 text-center text-gray-400">Loading…</div>;

  // Saved (DB) Cloudinary config — used for status badge; separate from live form state
  let savedCloud: Record<string, string> = {};
  try { savedCloud = JSON.parse(store.cloudinarySettings || "{}"); } catch { /* ignore */ }
  const cloudinaryConnected = !!(savedCloud.cloudName?.trim() && savedCloud.apiKey?.trim() && savedCloud.apiSecret?.trim());

  // ── Tab content renderers ────────────────────────────────────────────────────

  function GeneralTab() {
    return (
      <form onSubmit={e => { e.preventDefault(); saveStore({ name: store.name, description: store.description, email: store.email, phone: store.phone, logo: store.logo, currency: store.currency, timezone: store.timezone, primaryColor: store.primaryColor }); }}
        className="space-y-6">
        {/* Store info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Store Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input className={inp} value={store.name || ""} onChange={e => setStore((s: typeof store) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <span className="bg-gray-50 px-2 py-2 text-xs text-gray-400 border-r border-gray-200">/store/</span>
                <input readOnly className="flex-1 px-3 py-2 text-sm bg-gray-50 text-gray-500" value={store.slug || ""} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} className={inp} value={store.description || ""} onChange={e => setStore((s: typeof store) => ({ ...s, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" className={inp} value={store.email || ""} onChange={e => setStore((s: typeof store) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input className={inp} value={store.phone || ""} onChange={e => setStore((s: typeof store) => ({ ...s, phone: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Logo */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Store Logo</h3>
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {store.logo ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50">
                  <Image src={store.logo} alt="Store logo" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                  <button type="button" onClick={() => setStore((s: typeof store) => ({ ...s, logo: null }))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-red-600">
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 text-gray-400 text-xs text-center">
                  No Logo
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-gray-600">Upload a square logo (1:1 ratio). Appears in the sidebar and storefront.</p>
              <button type="button" onClick={() => setShowLogoGallery(true)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {store.logo ? "Change Logo" : "Choose from Gallery"}
              </button>
            </div>
          </div>
          <GalleryWidget open={showLogoGallery} multiple={false}
            onSelect={files => { if (files.length > 0) setStore((s: typeof store) => ({ ...s, logo: files[0].url })); setShowLogoGallery(false); }}
            onClose={() => setShowLogoGallery(false)} />
        </div>

        {/* Regional */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Regional</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select className={inp} value={store.currency || "INR"} onChange={e => setStore((s: typeof store) => ({ ...s, currency: e.target.value }))}>
                <option value="INR">INR — ₹</option>
                <option value="USD">USD — $</option>
                <option value="EUR">EUR — €</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select className={inp} value={store.timezone || "Asia/Kolkata"} onChange={e => setStore((s: typeof store) => ({ ...s, timezone: e.target.value }))}>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
              <input type="color" className="w-full h-10 border border-gray-200 rounded-lg cursor-pointer" value={store.primaryColor || "#16a34a"} onChange={e => setStore((s: typeof store) => ({ ...s, primaryColor: e.target.value }))} />
            </div>
          </div>
        </div>

        <SaveBar saving={saving} msg={msg} onClear={() => setMsg(null)} />
      </form>
    );
  }

  function OrdersTab() {
    return (
      <form onSubmit={e => { e.preventDefault(); saveStore({ returnWindowDays: store.returnWindowDays, reviewsEnabled: store.reviewsEnabled, reviewsRequireApproval: store.reviewsRequireApproval }); }}
        className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Returns Policy</h3>
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Window (days)</label>
            <input type="number" min="1" max="90" className={inp}
              value={store.returnWindowDays ?? 7}
              onChange={e => setStore((s: typeof store) => ({ ...s, returnWindowDays: parseInt(e.target.value) || 7 }))} />
            <p className="text-xs text-gray-400 mt-1">Customers can request returns within this many days of delivery.</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Product Reviews</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={store.reviewsEnabled ?? true}
                onChange={e => setStore((s: typeof store) => ({ ...s, reviewsEnabled: e.target.checked }))}
                className="w-4 h-4 text-[#ec1f78] rounded" />
              <div>
                <p className="text-sm font-medium text-gray-700">Enable Product Reviews</p>
                <p className="text-xs text-gray-400">Allow customers to leave reviews on products</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={store.reviewsRequireApproval ?? true}
                onChange={e => setStore((s: typeof store) => ({ ...s, reviewsRequireApproval: e.target.checked }))}
                className="w-4 h-4 text-[#ec1f78] rounded" />
              <div>
                <p className="text-sm font-medium text-gray-700">Require Approval Before Publishing</p>
                <p className="text-xs text-gray-400">Reviews must be approved by you before customers can see them</p>
              </div>
            </label>
          </div>
        </div>

        <SaveBar saving={saving} msg={msg} onClear={() => setMsg(null)} />
      </form>
    );
  }

  function EmailTab() {
    let es: Record<string, string | number | boolean> = {};
    try { es = JSON.parse(store.emailSettings || "{}"); } catch { /* ignore */ }
    const provider = (es.provider as string) || "smtp";

    const updateEs = (key: string, val: string | number | boolean) => {
      const updated = { ...es, [key]: val };
      setStore((s: typeof store) => ({ ...s, emailSettings: JSON.stringify(updated) }));
    };

    const EMAIL_EVENTS: Record<string, { label: string; desc: string }> = {
      orderConfirmed: { label: "Order Confirmed", desc: "Sent when an order is placed" },
      orderShipped:   { label: "Order Shipped",   desc: "Sent when shipment is booked" },
      orderDelivered: { label: "Order Delivered", desc: "Sent when order is marked delivered" },
      orderCancelled: { label: "Order Cancelled", desc: "Sent when an order is cancelled" },
      returnApproved: { label: "Return Approved", desc: "Sent when a return is approved" },
      welcomeEmail:   { label: "Welcome Email",   desc: "Sent when a customer registers" },
    };

    return (
      <form onSubmit={e => { e.preventDefault(); saveStore({ emailSettings: store.emailSettings }); }}
        className="space-y-6">

        {/* Provider config */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Email Provider</h3>
          <p className="text-xs text-gray-400 mb-3">Configure how transactional emails are sent to customers. Leave blank to use Buynoe platform email as fallback.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
              <select value={provider} onChange={e => updateEs("provider", e.target.value)} className={inp}>
                <option value="smtp">SMTP (Gmail, Zoho, custom)</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>

            {provider === "sendgrid" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SendGrid API Key</label>
                  <input type="password" value={(es.sendgridApiKey as string) || ""} onChange={e => updateEs("sendgridApiKey", e.target.value)}
                    placeholder="SG.xxxxxxxxxxxx" className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                  <input value={(es.sendgridFrom as string) || ""} onChange={e => updateEs("sendgridFrom", e.target.value)}
                    placeholder={`"${store.name}" <support@yourdomain.com>`} className={inp} />
                  <p className="text-xs text-gray-400 mt-1">Must be a verified sender in your SendGrid account.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                  <input value={(es.host as string) || ""} onChange={e => updateEs("host", e.target.value)} placeholder="smtp.gmail.com" className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input type="number" value={(es.port as number) || 587} onChange={e => updateEs("port", parseInt(e.target.value) || 587)} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input value={(es.user as string) || ""} onChange={e => updateEs("user", e.target.value)} placeholder="your@email.com" className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={(es.pass as string) || ""} onChange={e => updateEs("pass", e.target.value)} placeholder="App password" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Name / Email</label>
                  <input value={(es.from as string) || ""} onChange={e => updateEs("from", e.target.value)}
                    placeholder={`"${store.name}" <support@yourdomain.com>`} className={inp} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notification toggles */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">Notification Events</h3>
          <p className="text-xs text-gray-400 mb-3">Choose which emails are sent to customers automatically.</p>
          <div className="space-y-2.5">
            {Object.entries(EMAIL_EVENTS).map(([key, { label, desc }]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <input type="checkbox"
                  checked={(es[key] as boolean) !== false}
                  onChange={e => updateEs(key, e.target.checked)}
                  className="w-4 h-4 text-[#ec1f78] rounded shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <SaveBar saving={saving} msg={msg} onClear={() => setMsg(null)} />
      </form>
    );
  }

  function MediaTab() {
    let cloud: Record<string, string> = {};
    try { cloud = JSON.parse(store.cloudinarySettings || "{}"); } catch { /* ignore */ }

    const updateCloud = (key: string, val: string) => {
      const updated = { ...cloud, [key]: val };
      setStore((s: typeof store) => ({ ...s, cloudinarySettings: JSON.stringify(updated) }));
    };

    const monoInp = `${inp} font-mono`;

    const allFilled = !!(cloud.cloudName?.trim() && cloud.apiKey?.trim() && cloud.apiSecret?.trim());
    const isEmpty = !cloud.cloudName?.trim() && !cloud.apiKey?.trim() && !cloud.apiSecret?.trim();

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!allFilled && !isEmpty) {
        flash(false, "All three fields are required — Cloud Name, API Key, and API Secret.");
        return;
      }
      if (!allFilled && isEmpty) {
        flash(false, "Enter your Cloud Name, API Key, and API Secret to connect Cloudinary.");
        return;
      }
      saveStore({ cloudinarySettings: store.cloudinarySettings ?? "{}" });
    }

    const fieldClass = (val: string) =>
      `${monoInp} ${val.trim() === "" ? "border-red-300 focus:ring-red-400/30 focus:border-red-400" : ""}`;

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cloudinary</h3>
            {cloudinaryConnected
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full"><CheckCircle size={12} /> Connected</span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full"><AlertCircle size={12} /> Not connected</span>
            }
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Connect your own Cloudinary account. Images will be stored under{" "}
            <code className="bg-gray-100 px-1 rounded">stores/{store.slug}/</code>.
          </p>

          {!cloudinaryConnected && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Save your credentials first.</strong> Uploads (logos, product images) go to Buynoe shared storage until you save and connect your Cloudinary account.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cloud Name <span className="text-red-500">*</span>
              </label>
              <input value={cloud.cloudName || ""} onChange={e => updateCloud("cloudName", e.target.value)}
                placeholder="my-cloud-name" className={fieldClass(cloud.cloudName || "")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key <span className="text-red-500">*</span>
              </label>
              <input value={cloud.apiKey || ""} onChange={e => updateCloud("apiKey", e.target.value)}
                placeholder="123456789012345" className={fieldClass(cloud.apiKey || "")} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret <span className="text-red-500">*</span>
              </label>
              <input type="password" value={cloud.apiSecret || ""} onChange={e => updateCloud("apiSecret", e.target.value)}
                placeholder="Your Cloudinary API secret" className={fieldClass(cloud.apiSecret || "")} />
              <p className="text-xs text-gray-400 mt-1.5">
                Find these in your{" "}
                <a href="https://console.cloudinary.com" target="_blank" rel="noopener noreferrer"
                  className="underline text-[#ec1f78]">Cloudinary Console</a>{" "}
                under Settings &rarr; API Keys.
              </p>
            </div>
          </div>
        </div>

        <SaveBar saving={saving} msg={msg} onClear={() => setMsg(null)} />
      </form>
    );
  }

  function BusinessTab() {
    return (
      <form onSubmit={e => {
        e.preventDefault();
        saveMerchant({
          businessName: merchant?.businessName ?? "",
          businessRegNo: merchant?.businessRegNo ?? "",
          businessAddress: merchant?.businessAddress ?? "",
          businessGst: merchant?.businessGst ?? "",
        });
      }} className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1 uppercase tracking-wide">Business Profile</h3>
          <p className="text-xs text-gray-400 mb-4">This information appears on invoices sent to your customers.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business / Company Name</label>
              <input value={merchant?.businessName || ""} onChange={e => setMerchant((m: typeof merchant) => ({ ...m, businessName: e.target.value }))}
                placeholder="Acme Pvt Ltd" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={merchant?.businessRegNo || ""} onChange={e => setMerchant((m: typeof merchant) => ({ ...m, businessRegNo: e.target.value }))}
                placeholder="CIN / LLP / Reg No." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={merchant?.businessGst || ""} onChange={e => setMerchant((m: typeof merchant) => ({ ...m, businessGst: e.target.value }))}
                placeholder="27AADCB2230M1Z3" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registered Address <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={merchant?.businessAddress || ""} onChange={e => setMerchant((m: typeof merchant) => ({ ...m, businessAddress: e.target.value }))}
                placeholder="123 Main St, Mumbai, Maharashtra 400001" className={inp} />
            </div>
          </div>
        </div>

        <SaveBar saving={saving} msg={msg} onClear={() => setMsg(null)} />
      </form>
    );
  }


  return (
    <div>
      <PageHeader title="Store Settings" />

      {/* Plan Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-green-900">
            Current Plan: <span className="uppercase font-black">{merchant?.plan}</span>
          </p>
          {merchant?.trialEndsAt && (
            <p className="text-sm text-amber-600 mt-0.5">
              Trial ends {new Date(merchant.trialEndsAt).toLocaleDateString("en-IN")}
            </p>
          )}
          {merchant?.plan !== "ENTERPRISE" && (
            <p className="text-xs text-gray-500 mt-1">Upgrade to unlock more products, orders and features</p>
          )}
        </div>
        <Link href="/dashboard/billing"
          className="shrink-0 px-5 py-2.5 btn-brand text-sm font-semibold rounded-lg transition-colors shadow-sm">
          {merchant?.plan === "TRIAL" ? "Start Paid Plan" : "Manage Plan"} &rarr;
        </Link>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => { setTab(id); setMsg(null); }}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? "border-[#ec1f78] text-[#ec1f78]"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}>
              <Icon size={15} className="shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === "general"  && GeneralTab()}
          {tab === "orders"   && OrdersTab()}
          {tab === "email"    && EmailTab()}
          {tab === "media"    && MediaTab()}
          {tab === "business" && BusinessTab()}
        </div>
      </div>
    </div>
  );
}
