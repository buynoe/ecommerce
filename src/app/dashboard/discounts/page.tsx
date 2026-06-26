"use client";
import { useEffect, useState, useCallback } from "react";
import { Tag, Zap, Lightbulb, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string; code: string; type: string; value: number;
  minAmount?: number | null; maxUses?: number | null; maxUsesPerCustomer?: number | null;
  usedCount: number; startsAt?: string | null; endsAt?: string | null;
  isActive: boolean; createdAt: string;
}

interface AutoDiscount {
  id: string; title: string; type: string; value: number;
  minAmount?: number | null; maxUses?: number | null;
  usedCount: number; endsAt?: string | null; isActive: boolean; createdAt: string;
}

const COUPON_TYPES = [
  { value: "PERCENTAGE", label: "Percentage off (%)" },
  { value: "FLAT", label: "Flat amount off (₹)" },
  { value: "FREE_SHIPPING", label: "Free Shipping" },
  { value: "FIRST_ORDER", label: "First Order discount" },
];

const emptyCouponForm = () => ({
  code: "", type: "PERCENTAGE", value: "", minAmount: "",
  maxUses: "", maxUsesPerCustomer: "", startsAt: "", endsAt: "",
});

const emptyDiscountForm = () => ({
  title: "", type: "PERCENTAGE", value: "", minAmount: "", maxUses: "", endsAt: "",
});

function inputCls(err?: boolean) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${err ? "border-red-400 bg-red-50" : "border-gray-200"}`;
}

function typeLabel(type: string) {
  return COUPON_TYPES.find(t => t.value === type)?.label ?? type;
}

function typeColor(type: string) {
  const m: Record<string, string> = {
    PERCENTAGE: "bg-blue-100 text-blue-700",
    FLAT: "bg-green-100 text-green-700",
    FREE_SHIPPING: "bg-purple-100 text-purple-700",
    FIRST_ORDER: "bg-amber-100 text-amber-700",
    BUY_X_GET_Y: "bg-pink-100 text-pink-700",
  };
  return m[type] ?? "bg-gray-100 text-gray-600";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [activeTab, setActiveTab] = useState<"coupons" | "auto">("coupons");

  // Coupons state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [couponForm, setCouponForm] = useState(emptyCouponForm());
  const [couponErrors, setCouponErrors] = useState<Record<string, string>>({});
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponSaveErr, setCouponSaveErr] = useState("");

  // Auto-discounts state
  const [discounts, setDiscounts] = useState<AutoDiscount[]>([]);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm());
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountSaveErr, setDiscountSaveErr] = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    const r = await fetch("/api/coupons");
    const d = await r.json();
    setCoupons(d.coupons || []);
    setCouponsLoading(false);
  }, []);

  const loadDiscounts = useCallback(async () => {
    setDiscountsLoading(true);
    const r = await fetch("/api/discounts");
    const d = await r.json();
    setDiscounts(d.discounts || []);
    setDiscountsLoading(false);
  }, []);

  useEffect(() => { loadCoupons(); loadDiscounts(); }, [loadCoupons, loadDiscounts]);

  // ── Coupon validation ─────────────────────────────────────────────────────

  function validateCoupon() {
    const e: Record<string, string> = {};
    const code = couponForm.code.trim().toUpperCase();
    if (!code) e.code = "Coupon code is required";
    else if (!/^[A-Z0-9_-]{3,20}$/.test(code)) e.code = "3–20 characters: letters, numbers, - or _";
    if (!couponForm.value && couponForm.type !== "FREE_SHIPPING") e.value = "Value is required";
    else if (couponForm.type === "PERCENTAGE" && (parseFloat(couponForm.value) <= 0 || parseFloat(couponForm.value) > 100)) e.value = "Must be 1–100";
    else if (couponForm.type === "FLAT" && parseFloat(couponForm.value) <= 0) e.value = "Must be greater than 0";
    if (couponForm.minAmount && parseFloat(couponForm.minAmount) < 0) e.minAmount = "Must be 0 or more";
    if (couponForm.maxUses && parseInt(couponForm.maxUses) < 1) e.maxUses = "Must be at least 1";
    if (couponForm.startsAt && couponForm.endsAt && couponForm.startsAt > couponForm.endsAt) e.endsAt = "End date must be after start date";
    return e;
  }

  function updateCouponField(key: string, val: string) {
    setCouponForm(f => ({ ...f, [key]: val }));
    setCouponErrors(e => { const n = { ...e }; delete n[key]; return n; });
    setCouponSaveErr("");
  }

  async function saveCoupon(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateCoupon();
    setCouponErrors(errs);
    if (Object.keys(errs).length) return;
    setCouponSaving(true); setCouponSaveErr("");
    const payload = {
      code: couponForm.code.trim().toUpperCase(),
      type: couponForm.type,
      value: couponForm.type === "FREE_SHIPPING" ? 0 : parseFloat(couponForm.value),
      minAmount: couponForm.minAmount ? parseFloat(couponForm.minAmount) : undefined,
      maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : undefined,
      maxUsesPerCustomer: couponForm.maxUsesPerCustomer ? parseInt(couponForm.maxUsesPerCustomer) : undefined,
      startsAt: couponForm.startsAt || undefined,
      endsAt: couponForm.endsAt || undefined,
    };
    const r = await fetch("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setCouponSaveErr(d.error || "Failed to create coupon"); setCouponSaving(false); return; }
    setShowCouponForm(false); setCouponForm(emptyCouponForm()); setCouponErrors({}); setCouponSaving(false);
    loadCoupons();
  }

  async function toggleCoupon(id: string, isActive: boolean) {
    await fetch(`/api/coupons/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    loadCoupons();
  }

  async function deleteCoupon(id: string) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    await fetch(`/api/coupons/${id}`, { method: "DELETE" });
    loadCoupons();
  }

  // ── Auto-discount save ────────────────────────────────────────────────────

  async function saveDiscount(e: React.FormEvent) {
    e.preventDefault();
    if (!discountForm.title.trim()) { setDiscountSaveErr("Title is required"); return; }
    if (!discountForm.value) { setDiscountSaveErr("Value is required"); return; }
    setDiscountSaving(true); setDiscountSaveErr("");
    const payload = {
      title: discountForm.title,
      type: discountForm.type,
      value: parseFloat(discountForm.value),
      minAmount: discountForm.minAmount ? parseFloat(discountForm.minAmount) : undefined,
      maxUses: discountForm.maxUses ? parseInt(discountForm.maxUses) : undefined,
      endsAt: discountForm.endsAt || undefined,
    };
    const r = await fetch("/api/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) { setDiscountSaveErr(d.error || "Failed to create discount"); setDiscountSaving(false); return; }
    setShowDiscountForm(false); setDiscountForm(emptyDiscountForm()); setDiscountSaving(false);
    loadDiscounts();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isFreeShipping = couponForm.type === "FREE_SHIPPING";

  return (
    <div>
      <PageHeader
        title="Discounts & Coupons"
        subtitle="Create coupon codes for customers or automatic discount rules"
        action={
          activeTab === "coupons"
            ? <button onClick={() => { setCouponForm(emptyCouponForm()); setCouponErrors({}); setCouponSaveErr(""); setShowCouponForm(true); }} className="btn-brand px-4 py-2 rounded-lg text-sm font-semibold">+ New Coupon Code</button>
            : <button onClick={() => { setDiscountForm(emptyDiscountForm()); setDiscountSaveErr(""); setShowDiscountForm(true); }} className="btn-brand px-4 py-2 rounded-lg text-sm font-semibold">+ New Auto Discount</button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: "coupons", label: <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Coupon Codes</span> },
          { key: "auto", label: <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" /> Auto Discounts</span> },
        ] as { key: "coupons" | "auto"; label: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── COUPONS TAB ── */}
      {activeTab === "coupons" && (
        <>
          {/* Info banner */}
          <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-700 flex items-start gap-3">
            <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Coupon codes are entered by customers at checkout (e.g. <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">WELCOME20</code>). They are validated in real-time when the customer clicks Apply.</p>
          </div>

          {/* Create coupon modal */}
          {showCouponForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">New Coupon Code</h2>
                  <button onClick={() => setShowCouponForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>

                {couponSaveErr && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {couponSaveErr}</div>
                )}

                <form onSubmit={saveCoupon} className="space-y-4" noValidate>
                  {/* Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Coupon Code <span className="text-red-500">*</span></label>
                    <input
                      className={inputCls(!!couponErrors.code)}
                      value={couponForm.code}
                      onChange={e => updateCouponField("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      placeholder="e.g. SUMMER20 or FLAT100"
                      maxLength={20}
                    />
                    {couponErrors.code
                      ? <p className="text-xs text-red-500 mt-1">{couponErrors.code}</p>
                      : <p className="text-xs text-gray-400 mt-1">Letters, numbers, hyphens only. Customers type this at checkout.</p>}
                  </div>

                  {/* Type + Value */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Type <span className="text-red-500">*</span></label>
                      <select className={inputCls()} value={couponForm.type} onChange={e => updateCouponField("type", e.target.value)}>
                        {COUPON_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        {couponForm.type === "PERCENTAGE" || couponForm.type === "FIRST_ORDER" ? "Discount %" : couponForm.type === "FLAT" ? "Amount (₹)" : "Value"}
                        {!isFreeShipping && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        type="number" min="0" step="0.01"
                        className={inputCls(!!couponErrors.value)}
                        value={couponForm.value}
                        onChange={e => updateCouponField("value", e.target.value)}
                        placeholder={couponForm.type === "PERCENTAGE" || couponForm.type === "FIRST_ORDER" ? "20" : "100"}
                        disabled={isFreeShipping}
                      />
                      {couponErrors.value && <p className="text-xs text-red-500 mt-1">{couponErrors.value}</p>}
                    </div>
                  </div>

                  {/* Min amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Minimum Order Amount (₹) <span className="text-gray-400 font-normal">optional</span></label>
                    <input type="number" min="0" step="0.01"
                      className={inputCls(!!couponErrors.minAmount)}
                      value={couponForm.minAmount}
                      onChange={e => updateCouponField("minAmount", e.target.value)}
                      placeholder="e.g. 499" />
                    {couponErrors.minAmount && <p className="text-xs text-red-500 mt-1">{couponErrors.minAmount}</p>}
                  </div>

                  {/* Usage limits */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Total Uses Limit <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="number" min="1"
                        className={inputCls(!!couponErrors.maxUses)}
                        value={couponForm.maxUses}
                        onChange={e => updateCouponField("maxUses", e.target.value)}
                        placeholder="e.g. 500" />
                      {couponErrors.maxUses && <p className="text-xs text-red-500 mt-1">{couponErrors.maxUses}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Uses per Customer <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="number" min="1"
                        className={inputCls()}
                        value={couponForm.maxUsesPerCustomer}
                        onChange={e => updateCouponField("maxUsesPerCustomer", e.target.value)}
                        placeholder="e.g. 1" />
                    </div>
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="date" className={inputCls()}
                        value={couponForm.startsAt}
                        onChange={e => updateCouponField("startsAt", e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End Date <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="date" className={inputCls(!!couponErrors.endsAt)}
                        value={couponForm.endsAt}
                        onChange={e => updateCouponField("endsAt", e.target.value)} />
                      {couponErrors.endsAt && <p className="text-xs text-red-500 mt-1">{couponErrors.endsAt}</p>}
                    </div>
                  </div>

                  {/* Preview */}
                  {couponForm.code && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
                      <p className="font-semibold text-gray-700 mb-1">Preview</p>
                      <p>Code: <span className="font-mono font-bold text-green-700 text-sm">{couponForm.code.trim().toUpperCase() || "—"}</span></p>
                      <p>Discount: {isFreeShipping ? "Free Shipping" : couponForm.type === "PERCENTAGE" || couponForm.type === "FIRST_ORDER" ? `${couponForm.value || "?"}% off` : `₹${couponForm.value || "?"} off`}</p>
                      {couponForm.minAmount && <p>Min order: ₹{couponForm.minAmount}</p>}
                      {couponForm.endsAt && <p>Expires: {new Date(couponForm.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowCouponForm(false)}
                      className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={couponSaving}
                      className="flex-1 btn-brand rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                      {couponSaving ? "Creating…" : "Create Coupon"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Coupons list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {couponsLoading ? (
              <div className="p-12 text-center text-gray-400">Loading…</div>
            ) : coupons.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mb-3 flex justify-center"><Tag className="w-14 h-14 text-gray-300" /></div>
                <p className="text-gray-500 font-medium mb-1">No coupon codes yet</p>
                <p className="text-sm text-gray-400 mb-5">Create your first coupon code to offer discounts to customers at checkout</p>
                <button onClick={() => { setCouponForm(emptyCouponForm()); setCouponErrors({}); setShowCouponForm(true); }}
                  className="btn-brand px-5 py-2.5 rounded-lg text-sm font-semibold">
                  + Create First Coupon
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Code", "Type", "Discount", "Min Order", "Used", "Validity", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coupons.map(c => {
                    const isExpired = c.endsAt ? new Date(c.endsAt) < new Date() : false;
                    const isExhausted = c.maxUses ? c.usedCount >= c.maxUses : false;
                    const effectiveStatus = !c.isActive ? "Inactive" : isExpired ? "Expired" : isExhausted ? "Exhausted" : "Active";
                    const statusColor = effectiveStatus === "Active" ? "bg-green-100 text-green-700" : effectiveStatus === "Inactive" ? "bg-gray-100 text-gray-500" : "bg-red-100 text-red-600";
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-sm tracking-wide">
                            {c.code}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor(c.type)}`}>
                            {typeLabel(c.type)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                          {c.type === "PERCENTAGE" || c.type === "FIRST_ORDER" ? `${c.value}%` : c.type === "FLAT" ? formatCurrency(c.value) : "Free Ship"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {c.minAmount ? formatCurrency(c.minAmount) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600">
                          {c.usedCount}{c.maxUses ? <span className="text-gray-400"> / {c.maxUses}</span> : ""}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">
                          {c.startsAt && <p>From {formatDate(c.startsAt)}</p>}
                          {c.endsAt ? <p className={isExpired ? "text-red-500 font-medium" : ""}>Until {formatDate(c.endsAt)}</p> : <span className="text-gray-300">No expiry</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor}`}>{effectiveStatus}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <button onClick={() => toggleCoupon(c.id, c.isActive)}
                              className={`text-xs font-semibold ${c.isActive ? "text-amber-600 hover:text-amber-800" : "text-[#ec1f78] hover:text-green-800"}`}>
                              {c.isActive ? "Pause" : "Activate"}
                            </button>
                            <button onClick={() => deleteCoupon(c.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── AUTO DISCOUNTS TAB ── */}
      {activeTab === "auto" && (
        <>
          <div className="mb-5 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 text-sm text-amber-700 flex items-start gap-3">
            <Zap className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Auto discounts are applied automatically at checkout without a code — e.g. buy any product from a collection and get 10% off.</p>
          </div>

          {showDiscountForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-gray-900">New Auto Discount</h2>
                  <button onClick={() => setShowDiscountForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                </div>
                {discountSaveErr && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {discountSaveErr}</div>}
                <form onSubmit={saveDiscount} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Discount Title <span className="text-red-500">*</span></label>
                    <input required placeholder="e.g. Summer Sale 15% Off" className={inputCls()}
                      value={discountForm.title} onChange={e => setDiscountForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Type <span className="text-red-500">*</span></label>
                      <select className={inputCls()} value={discountForm.type} onChange={e => setDiscountForm(f => ({ ...f, type: e.target.value }))}>
                        <option value="PERCENTAGE">Percentage %</option>
                        <option value="FLAT">Flat ₹</option>
                        <option value="FREE_SHIPPING">Free Shipping</option>
                        <option value="BUY_X_GET_Y">Buy X Get Y</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Value <span className="text-red-500">*</span></label>
                      <input required type="number" min="0" step="0.01" placeholder="10" className={inputCls()}
                        value={discountForm.value} onChange={e => setDiscountForm(f => ({ ...f, value: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Min Order Amount (₹) <span className="text-gray-400 font-normal">optional</span></label>
                    <input type="number" min="0" placeholder="0" className={inputCls()}
                      value={discountForm.minAmount} onChange={e => setDiscountForm(f => ({ ...f, minAmount: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Max Uses <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="number" min="1" placeholder="Unlimited" className={inputCls()}
                        value={discountForm.maxUses} onChange={e => setDiscountForm(f => ({ ...f, maxUses: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Expiry Date <span className="text-gray-400 font-normal">optional</span></label>
                      <input type="date" className={inputCls()}
                        value={discountForm.endsAt} onChange={e => setDiscountForm(f => ({ ...f, endsAt: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowDiscountForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={discountSaving} className="flex-1 btn-brand rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">
                      {discountSaving ? "Creating…" : "Create"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {discountsLoading ? (
              <div className="p-12 text-center text-gray-400">Loading…</div>
            ) : discounts.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mb-3 flex justify-center"><Zap className="w-14 h-14 text-gray-300" /></div>
                <p className="text-gray-500 font-medium mb-5">No auto discounts yet</p>
                <button onClick={() => setShowDiscountForm(true)} className="btn-brand px-5 py-2.5 rounded-lg text-sm font-semibold">+ Create First Auto Discount</button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{["Title","Type","Value","Used","Expires","Status"].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discounts.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{d.title}</td>
                      <td className="px-6 py-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeColor(d.type)}`}>{d.type}</span></td>
                      <td className="px-6 py-4 text-sm font-semibold">{d.type === "PERCENTAGE" ? `${d.value}%` : d.type === "FLAT" ? formatCurrency(d.value) : "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ""}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{d.endsAt ? formatDate(d.endsAt) : "No expiry"}</td>
                      <td className="px-6 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${d.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{d.isActive ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
