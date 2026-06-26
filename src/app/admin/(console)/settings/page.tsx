"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Save, Send, Eye, EyeOff, CheckCircle, AlertCircle,
  Settings, Mail, CreditCard, RefreshCw, ToggleLeft, ToggleRight,
  Zap, ChevronDown, ChevronUp, Building2,
} from "lucide-react";

type Tab = "payment" | "email" | "profile";
type EmailProvider = "smtp" | "sendgrid";

interface FormData {
  // Platform profile
  PLATFORM_NAME: string;
  PLATFORM_TAGLINE: string;
  PLATFORM_ADDRESS: string;
  PLATFORM_GST: string;
  PLATFORM_CONTACT_EMAIL: string;
  PLATFORM_CONTACT_PHONE: string;
  PLATFORM_LOGO_URL: string;
  PLATFORM_WEBSITE: string;
  // Razorpay
  RAZORPAY_ENABLED: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  // Cashfree
  CASHFREE_ENABLED: string;
  CASHFREE_APP_ID: string;
  CASHFREE_SECRET_KEY: string;
  CASHFREE_ENV: string;
  // Email provider
  EMAIL_PROVIDER: string;
  // SMTP
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  // SendGrid
  SENDGRID_API_KEY: string;
  SENDGRID_FROM: string;
  // Notification toggles
  EMAIL_SIGNUP: string;
  EMAIL_PLAN_UPGRADE: string;
  EMAIL_PLAN_EXPIRY: string;
  EMAIL_PAYMENT: string;
}

const DEFAULT: FormData = {
  PLATFORM_NAME: "Buynoe", PLATFORM_TAGLINE: "SaaS Ecommerce Platform",
  PLATFORM_ADDRESS: "", PLATFORM_GST: "", PLATFORM_CONTACT_EMAIL: "support@buynoe.com",
  PLATFORM_CONTACT_PHONE: "", PLATFORM_LOGO_URL: "", PLATFORM_WEBSITE: "https://buynoe.com",
  RAZORPAY_ENABLED: "true",  RAZORPAY_KEY_ID: "",    RAZORPAY_KEY_SECRET: "",
  CASHFREE_ENABLED: "false", CASHFREE_APP_ID: "",     CASHFREE_SECRET_KEY: "", CASHFREE_ENV: "sandbox",
  EMAIL_PROVIDER: "smtp",
  SMTP_HOST: "", SMTP_PORT: "587", SMTP_USER: "", SMTP_PASS: "", SMTP_FROM: "Buynoe <noreply@buynoe.com>",
  SENDGRID_API_KEY: "", SENDGRID_FROM: "Buynoe <noreply@buynoe.com>",
  EMAIL_SIGNUP: "true", EMAIL_PLAN_UPGRADE: "true", EMAIL_PLAN_EXPIRY: "true", EMAIL_PAYMENT: "true",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("payment");
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [runningCron, setRunningCron] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ razorpay: true, cashfree: false });

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings");
    const d = await r.json();
    if (d.settings) setForm(f => ({ ...f, ...d.settings }));
  }, []);

  useEffect(() => { load(); }, [load]);

  function set(key: keyof FormData, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setMsg(null);
  }

  function toggleBool(key: keyof FormData) {
    setForm(f => ({ ...f, [key]: f[key] === "true" ? "false" : "true" }));
    setMsg(null);
  }

  function toggleShow(key: string) {
    setShow(s => ({ ...s, [key]: !s[key] }));
  }

  function toggleExpand(key: string) {
    setExpanded(s => ({ ...s, [key]: !s[key] }));
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      setMsg({ ok: d.ok, text: d.ok ? `Saved ${d.updated} setting(s) successfully.` : d.error || "Save failed." });
    } catch {
      setMsg({ ok: false, text: "Request failed — check server logs." });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/settings/test-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const d = await r.json();
      setMsg({ ok: !!d.success, text: d.success ? `Test email sent to ${d.sentTo} via ${d.provider === "sendgrid" ? "SendGrid" : "SMTP"}.` : (d.error || "Failed to send.") });
    } catch {
      setMsg({ ok: false, text: "Request failed — check server logs." });
    } finally {
      setTesting(false);
    }
  }

  async function runTrialCheck() {
    setRunningCron(true); setMsg(null);
    const r = await fetch("/api/cron/trial-check");
    const d = await r.json();
    setRunningCron(false);
    if (d.ok) {
      const { expiringSoon, justExpired, emailsSent } = d.results;
      setMsg({ ok: true, text: `Trial check done — ${expiringSoon} expiring soon, ${justExpired} just expired, ${emailsSent} email(s) sent.` });
    } else {
      setMsg({ ok: false, text: d.error || "Trial check failed." });
    }
  }

  const inp = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400 bg-white";
  const brand = { background: "linear-gradient(90deg,#ec1f78,#ff6e30)" };
  const provider = form.EMAIL_PROVIDER as EmailProvider;

  const BoolToggle = ({ k }: { k: keyof FormData }) => (
    <button
      type="button"
      onClick={() => toggleBool(k)}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form[k] === "true" ? "bg-gradient-to-r from-[#ec1f78] to-[#ff6e30]" : "bg-gray-200"}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[k] === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );

  const GatewayEnabled = ({ k, label }: { k: keyof FormData; label: string }) => (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${form[k] === "true" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
        {form[k] === "true" ? "Active" : "Inactive"}
      </span>
      <button
        type="button"
        onClick={() => toggleBool(k)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title={`Toggle ${label}`}
      >
        {form[k] === "true"
          ? <ToggleRight size={22} style={{ color: "#ec1f78" }} />
          : <ToggleLeft size={22} />}
      </button>
    </div>
  );

  const SecretInput = ({ fKey, placeholder }: { fKey: keyof FormData; placeholder: string }) => (
    <div className="relative">
      <input
        type={show[fKey] ? "text" : "password"}
        value={form[fKey]}
        onChange={e => set(fKey, e.target.value)}
        placeholder={placeholder}
        className={`${inp} pr-10`}
      />
      <button type="button" onClick={() => toggleShow(fKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show[fKey] ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: typeof CreditCard }[] = [
    { id: "profile", label: "Platform Profile", icon: Building2 },
    { id: "payment", label: "Payment Gateways", icon: CreditCard },
    { id: "email",   label: "Email Settings",   icon: Mail },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={brand}>
          <Settings size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure payment gateways and email delivery for all merchants</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setMsg(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* Status toast */}
      {msg && (
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* ── PLATFORM PROFILE TAB ── */}
      {tab === "profile" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            This information appears on all subscription invoices issued to merchants. Keep it accurate for GST compliance.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Platform / Company Name</label>
                <input value={form.PLATFORM_NAME} onChange={e => set("PLATFORM_NAME", e.target.value)} placeholder="Buynoe" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tagline</label>
                <input value={form.PLATFORM_TAGLINE} onChange={e => set("PLATFORM_TAGLINE", e.target.value)} placeholder="SaaS Ecommerce Platform" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Website</label>
                <input value={form.PLATFORM_WEBSITE} onChange={e => set("PLATFORM_WEBSITE", e.target.value)} placeholder="https://buynoe.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">GST Number</label>
                <input value={form.PLATFORM_GST} onChange={e => set("PLATFORM_GST", e.target.value)} placeholder="27AADCB2230M1Z3" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Email</label>
                <input type="email" value={form.PLATFORM_CONTACT_EMAIL} onChange={e => set("PLATFORM_CONTACT_EMAIL", e.target.value)} placeholder="support@buynoe.com" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contact Phone</label>
                <input value={form.PLATFORM_CONTACT_PHONE} onChange={e => set("PLATFORM_CONTACT_PHONE", e.target.value)} placeholder="+91 9876543210" className={inp} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Registered Address</label>
                <textarea rows={2} value={form.PLATFORM_ADDRESS} onChange={e => set("PLATFORM_ADDRESS", e.target.value)} placeholder="123 Main St, Mumbai, Maharashtra 400001, India" className={`${inp} resize-none`} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Logo URL <span className="text-gray-400 font-normal normal-case">(optional — used in invoices)</span></label>
                <input value={form.PLATFORM_LOGO_URL} onChange={e => set("PLATFORM_LOGO_URL", e.target.value)} placeholder="https://cdn.example.com/logo.png" className={inp} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
              <Save size={15} className={saving ? "animate-pulse" : ""} />
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* ── PAYMENT GATEWAYS TAB ── */}
      {tab === "payment" && (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Enable and configure the payment gateways merchants can use for plan subscriptions. You can activate multiple gateways — the merchant billing page will use the first active one.
          </p>

          {/* ── Razorpay ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div
              onClick={() => toggleExpand("razorpay")}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-[#072654] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xs">RZP</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Razorpay</div>
                <div className="text-xs text-gray-500 mt-0.5">Cards, UPI, Net Banking, Wallets, EMI</div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <GatewayEnabled k="RAZORPAY_ENABLED" label="Razorpay" />
              </div>
              {expanded.razorpay ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
            </div>

            {expanded.razorpay && (
              <>
                <div className="px-6 pb-6 space-y-5 border-t border-gray-50 pt-5">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                    Get your API keys from the{" "}
                    <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noreferrer" className="font-semibold underline">Razorpay Dashboard</a>.
                    Use <code className="bg-blue-100 px-1 rounded">rzp_test_</code> keys for testing.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Key ID</label>
                    <input
                      value={form.RAZORPAY_KEY_ID}
                      onChange={e => set("RAZORPAY_KEY_ID", e.target.value)}
                      placeholder="rzp_live_xxxxxxxxxxxx"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Key Secret</label>
                    <SecretInput fKey="RAZORPAY_KEY_SECRET" placeholder="Your Razorpay key secret" />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                    <Save size={14} /> {saving ? "Saving…" : "Save Razorpay"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ── Cashfree ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div
              onClick={() => toggleExpand("cashfree")}
              className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00BAF2] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-xs">CF</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 text-sm">Cashfree Payments</div>
                <div className="text-xs text-gray-500 mt-0.5">Cards, UPI, Net Banking, Paylater, BNPL</div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <GatewayEnabled k="CASHFREE_ENABLED" label="Cashfree" />
              </div>
              {expanded.cashfree ? <ChevronUp size={16} className="text-gray-400 ml-1" /> : <ChevronDown size={16} className="text-gray-400 ml-1" />}
            </div>

            {expanded.cashfree && (
              <>
                <div className="px-6 pb-6 space-y-5 border-t border-gray-50 pt-5">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                    Get your credentials from the{" "}
                    <a href="https://merchant.cashfree.com/merchants/developer" target="_blank" rel="noreferrer" className="font-semibold underline">Cashfree Merchant Dashboard</a>.
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">App ID</label>
                    <input
                      value={form.CASHFREE_APP_ID}
                      onChange={e => set("CASHFREE_APP_ID", e.target.value)}
                      placeholder="Your Cashfree App ID"
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret Key</label>
                    <SecretInput fKey="CASHFREE_SECRET_KEY" placeholder="Your Cashfree secret key" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Environment</label>
                    <div className="flex gap-2">
                      {(["sandbox", "production"] as const).map(env => (
                        <button
                          key={env}
                          type="button"
                          onClick={() => set("CASHFREE_ENV", env)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                            form.CASHFREE_ENV === env
                              ? "border-[#ec1f78] text-[#ec1f78] bg-pink-50"
                              : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {env === "sandbox" ? "Sandbox (Testing)" : "Production (Live)"}
                        </button>
                      ))}
                    </div>
                    {form.CASHFREE_ENV === "production" && (
                      <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Production mode — real payments will be processed.</p>
                    )}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                    <Save size={14} /> {saving ? "Saving…" : "Save Cashfree"}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800">
            <strong>Note:</strong> Settings saved here override <code>.env</code> values and take effect immediately for new plan purchases.
          </div>
        </div>
      )}

      {/* ── EMAIL SETTINGS TAB ── */}
      {tab === "email" && (
        <div className="space-y-5">

          {/* Provider selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Email Provider</h2>
              <p className="text-xs text-gray-500 mt-0.5">Choose how transactional emails are sent to merchants</p>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-3">
              {/* SMTP option */}
              <button
                type="button"
                onClick={() => set("EMAIL_PROVIDER", "smtp")}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  provider === "smtp"
                    ? "border-[#ec1f78] bg-pink-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${provider === "smtp" ? "bg-[#ec1f78]" : "bg-gray-100"}`}>
                  <Mail size={15} className={provider === "smtp" ? "text-white" : "text-gray-500"} />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${provider === "smtp" ? "text-[#ec1f78]" : "text-gray-700"}`}>Custom SMTP</div>
                  <div className="text-xs text-gray-500 mt-0.5">Gmail, Zoho, your own mail server</div>
                </div>
              </button>

              {/* SendGrid option */}
              <button
                type="button"
                onClick={() => set("EMAIL_PROVIDER", "sendgrid")}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  provider === "sendgrid"
                    ? "border-[#ec1f78] bg-pink-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${provider === "sendgrid" ? "bg-[#ec1f78]" : "bg-gray-100"}`}>
                  <Zap size={15} className={provider === "sendgrid" ? "text-white" : "text-gray-500"} />
                </div>
                <div>
                  <div className={`font-semibold text-sm ${provider === "sendgrid" ? "text-[#ec1f78]" : "text-gray-700"}`}>SendGrid</div>
                  <div className="text-xs text-gray-500 mt-0.5">API key — high deliverability</div>
                </div>
              </button>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                <Save size={14} /> {saving ? "Saving…" : "Save Provider"}
              </button>
            </div>
          </div>

          {/* SMTP config */}
          {provider === "smtp" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <h2 className="font-semibold text-gray-900">SMTP Configuration</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Works with Gmail, Zoho, Outlook, Mailgun SMTP, and any other mail server</p>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP Host</label>
                    <input value={form.SMTP_HOST} onChange={e => set("SMTP_HOST", e.target.value)} placeholder="smtp.gmail.com" className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                    <input value={form.SMTP_PORT} onChange={e => set("SMTP_PORT", e.target.value)} placeholder="587" className={inp} />
                    <p className="text-xs text-gray-400 mt-1">587 (TLS) · 465 (SSL) · 25 (plain)</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Username / Email</label>
                  <input value={form.SMTP_USER} onChange={e => set("SMTP_USER", e.target.value)} placeholder="noreply@buynoe.com" className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password / App Password</label>
                  <SecretInput fKey="SMTP_PASS" placeholder="SMTP password or app password" />
                  <p className="text-xs text-gray-400 mt-1">For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline text-[#ec1f78]">App Password</a> (requires 2-step verification).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name & Address</label>
                  <input value={form.SMTP_FROM} onChange={e => set("SMTP_FROM", e.target.value)} placeholder='Buynoe <noreply@buynoe.com>' className={inp} />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                  <Save size={14} /> {saving ? "Saving…" : "Save SMTP"}
                </button>
              </div>
            </div>
          )}

          {/* SendGrid config */}
          {provider === "sendgrid" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                <Zap size={18} className="text-gray-400" />
                <div>
                  <h2 className="font-semibold text-gray-900">SendGrid Configuration</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Sends email via SendGrid's SMTP relay using your API key</p>
                </div>
              </div>
              <div className="px-6 py-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
                  Create a free SendGrid account and generate an API key with <strong>Mail Send</strong> permission at{" "}
                  <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noreferrer" className="font-semibold underline">app.sendgrid.com/settings/api_keys</a>.
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">SendGrid API Key</label>
                  <SecretInput fKey="SENDGRID_API_KEY" placeholder="SG.xxxxxxxxxxxxxxxxxxxxxx" />
                  <p className="text-xs text-gray-400 mt-1">Starts with <code className="bg-gray-100 px-1 rounded">SG.</code></p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From Name & Address</label>
                  <input value={form.SENDGRID_FROM} onChange={e => set("SENDGRID_FROM", e.target.value)} placeholder='Buynoe <noreply@buynoe.com>' className={inp} />
                  <p className="text-xs text-gray-400 mt-1">This address must be verified as a Sender Identity in SendGrid.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                  <Save size={14} /> {saving ? "Saving…" : "Save SendGrid"}
                </button>
              </div>
            </div>
          )}

          {/* Test email */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Send Test Email</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Verify your {provider === "sendgrid" ? "SendGrid" : "SMTP"} settings are working correctly
              </p>
            </div>
            <div className="px-6 py-5 flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Send to</label>
                <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="admin@buynoe.com" className={inp} />
              </div>
              <button onClick={sendTest} disabled={testing || !testEmail} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shrink-0" style={brand}>
                <Send size={14} /> {testing ? "Sending…" : "Send Test"}
              </button>
            </div>
          </div>

          {/* Notification toggles */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Merchant Email Notifications</h2>
              <p className="text-xs text-gray-500 mt-0.5">Control which emails are automatically sent to merchants</p>
            </div>
            <div className="divide-y divide-gray-50">
              {([
                { k: "EMAIL_SIGNUP",       label: "Signup welcome",         desc: "Sent when merchant verifies their email after registering" },
                { k: "EMAIL_PLAN_UPGRADE", label: "Plan upgrade",           desc: "Sent after a successful plan purchase or upgrade" },
                { k: "EMAIL_PLAN_EXPIRY",  label: "Trial expiry alerts",    desc: "7-day warning + expiry notification (via cron)" },
                { k: "EMAIL_PAYMENT",      label: "Payment confirmation",   desc: "Payment success receipt sent after each transaction" },
              ] as const).map(({ k, label, desc }) => (
                <div key={k} className="flex items-center justify-between px-6 py-4 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                  </div>
                  <BoolToggle k={k} />
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={brand}>
                <Save size={14} /> {saving ? "Saving…" : "Save Toggles"}
              </button>
            </div>
          </div>

          {/* Trial expiry cron */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Trial Expiry Check</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Scans all trial merchants and sends 7-day warnings + expiry notices. Schedule daily via cron:{" "}
                <code className="bg-gray-100 px-1 rounded text-[11px]">GET /api/cron/trial-check</code>
                {" "}with{" "}
                <code className="bg-gray-100 px-1 rounded text-[11px]">Authorization: Bearer CRON_SECRET</code>
              </p>
            </div>
            <div className="px-6 py-5 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Sends <strong>7-day warning</strong> and <strong>trial expired</strong> emails to eligible merchants.
              </div>
              <button
                onClick={runTrialCheck}
                disabled={runningCron}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 shrink-0"
                style={brand}
              >
                <RefreshCw size={14} className={runningCron ? "animate-spin" : ""} />
                {runningCron ? "Running…" : "Run Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
