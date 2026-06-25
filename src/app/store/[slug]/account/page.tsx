"use client";
import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CartBadge from "@/components/storefront/CartBadge";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-pink-100 text-pink-700",
  RETURNED: "bg-rose-100 text-rose-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment", PAID: "Paid", CONFIRMED: "Confirmed",
  PROCESSING: "Processing", PACKED: "Packed", SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered",
  CANCELLED: "Cancelled", REFUNDED: "Refunded", RETURNED: "Returned",
};

const RETURN_REASONS = [
  "Product damaged / defective",
  "Wrong item delivered",
  "Size / fit issue",
  "Product not as described",
  "Changed my mind",
  "Quality not satisfactory",
  "Better price found elsewhere",
  "Other",
];

const CANCEL_REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery time too long",
  "Incorrect shipping address",
  "Payment issue",
  "Other",
];

// Statuses that can still be cancelled
const CANCELLABLE = ["PENDING_PAYMENT", "PAID", "CONFIRMED"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "login" | "register" | "orders" | "profile" | "addresses";

// ── Cancel Modal ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CancelModal({ order, storeId, onClose, onSuccess }: { order: any; storeId: string; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true); setError("");
    const finalReason = reason === "Other" ? customReason.trim() || "Other" : reason;
    const res = await fetch("/api/storefront/cancel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, orderId: order.id, reason: finalReason }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Cancellation failed"); setSubmitting(false); return; }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Cancel Order</h2>
              <p className="text-xs text-gray-500 mt-0.5">#{order.orderNumber} · {formatCurrency(order.total, "INR")}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-xl">×</button>
          </div>

          <div className="p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Before you cancel</p>
              <p>Once cancelled, this cannot be undone. If you&apos;ve already paid, a refund will be initiated within 5–7 business days.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Reason for Cancellation <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {CANCEL_REASONS.map(r => (
                  <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === r ? "border-red-400 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="cancelReason" value={r} checked={reason === r} onChange={() => setReason(r)} className="text-red-500" />
                    <span className="text-sm text-gray-700">{r}</span>
                  </label>
                ))}
              </div>
              {reason === "Other" && (
                <textarea
                  className="mt-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none resize-none"
                  rows={2} placeholder="Please describe your reason…"
                  value={customReason} onChange={e => setCustomReason(e.target.value)}
                />
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={submit} disabled={submitting}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors">
                {submitting ? "Cancelling…" : "Yes, Cancel Order"}
              </button>
              <button onClick={onClose}
                className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
                Keep Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Return Modal ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReturnModal({ order, storeId, onClose, onSuccess }: { order: any; storeId: string; onClose: () => void; onSuccess: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItems, setSelectedItems] = useState<Record<string, { qty: number; reason: string }>>({});
  const [globalReason, setGlobalReason] = useState(RETURN_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleItem(item: { id: string; quantity: number }) {
    setSelectedItems(prev => {
      const n = { ...prev };
      if (n[item.id]) delete n[item.id];
      else n[item.id] = { qty: item.quantity, reason: globalReason };
      return n;
    });
  }

  const totalRefund = order.items
    .filter((i: { id: string }) => selectedItems[i.id])
    .reduce((s: number, i: { id: string; price: number }) => s + i.price * (selectedItems[i.id]?.qty || 1), 0);

  async function submit() {
    if (!Object.keys(selectedItems).length) { setError("Select at least one item to return"); return; }
    setSubmitting(true); setError("");
    const res = await fetch("/api/storefront/returns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId, orderId: order.id, reason: globalReason,
        items: Object.entries(selectedItems).map(([orderItemId, v]) => ({
          orderItemId, quantity: v.qty, reason: v.reason || globalReason,
        })),
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Return request failed"); setSubmitting(false); return; }
    setSubmitting(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Return Request</h2>
            <p className="text-xs text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          {/* Return reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Reason for Return <span className="text-red-500">*</span></label>
            <select value={globalReason} onChange={e => setGlobalReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {RETURN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Item selection */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Select Items to Return <span className="text-red-500">*</span></p>
            <div className="space-y-2">
              {order.items.map((item: { id: string; title: string; variantTitle?: string; variantImageUrl?: string | null; quantity: number; price: number; product?: { images?: { url: string }[] } }) => (
                <label key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedItems[item.id] ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="checkbox" checked={!!selectedItems[item.id]} onChange={() => toggleItem(item)} className="w-4 h-4 text-green-600 rounded" />
                  <div className="w-12 h-12 bg-gray-100 rounded-lg shrink-0 overflow-hidden flex items-center justify-center">
                    {(item.variantImageUrl || item.product?.images?.[0]?.url)
                      ? <img src={item.variantImageUrl || item.product!.images![0].url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.title}</p>
                    {item.variantTitle && item.variantTitle !== "Default" && <p className="text-xs text-gray-500">{item.variantTitle}</p>}
                    <p className="text-xs text-gray-400">Qty: {item.quantity} · {formatCurrency(item.price, "INR")} each</p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm shrink-0">{formatCurrency(item.price * item.quantity, "INR")}</p>
                </label>
              ))}
            </div>
          </div>

          {/* Refund estimate */}
          {Object.keys(selectedItems).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-900">Estimated Refund</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalRefund, "INR")}</p>
              <p className="text-xs text-green-600 mt-1">Refund will be processed within 5-7 business days after item inspection</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Return Policy</p>
            <p>• Items must be unused and in original packaging</p>
            <p>• Return window: within 7 days of delivery</p>
            <p>• A pickup will be arranged once return is approved</p>
          </div>

          <div className="flex gap-3">
            <button onClick={submit} disabled={submitting || Object.keys(selectedItems).length === 0}
              className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit Return Request"}
            </button>
            <button onClick={onClose} className="flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Edit Panel ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfileEditPanel({ customer, storeId, onUpdated }: { customer: any; storeId: string; onUpdated: (c: any) => void }) {
  const [form, setForm] = useState({
    firstName: customer.firstName || "",
    lastName: customer.lastName || "",
    phone: customer.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match"); return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    setSaving(true);
    const body: Record<string, string> = {
      storeId, firstName: form.firstName, lastName: form.lastName, phone: form.phone,
    };
    if (form.newPassword) { body.currentPassword = form.currentPassword; body.newPassword = form.newPassword; }
    const res = await fetch("/api/storefront/customer/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || "Update failed"); return; }
    setSuccess("Profile updated successfully!");
    setForm(f => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
    onUpdated(d.customer);
    setTimeout(() => setSuccess(""), 3000);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Profile</h2>
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">✓ {success}</div>}
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
              <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
              <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <input disabled value={customer.email}
              className="w-full border border-gray-100 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
              inputMode="numeric" placeholder="10-digit mobile number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Change Password <span className="text-xs font-normal text-gray-400">(leave blank to keep current)</span></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Current Password</label>
                <input type="password" value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                  <input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Min 6 characters"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customer, setCustomer] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [returnOrder, setReturnOrder] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cancelOrder, setCancelOrder] = useState<any>(null);
  // Item-level cancel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cancelItemTarget, setCancelItemTarget] = useState<{ order: any; item: any } | null>(null);
  const [cancelItemReason, setCancelItemReason] = useState("");
  const [cancelItemLoading, setCancelItemLoading] = useState(false);
  const [cancelItemMsg, setCancelItemMsg] = useState("");

  // Address management
  interface AddrForm { firstName: string; lastName: string; phone: string; address1: string; address2: string; city: string; state: string; pincode: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [addrForm, setAddrForm] = useState<AddrForm>({ firstName: "", lastName: "", phone: "", address1: "", address2: "", city: "", state: "", pincode: "" });
  const [addrErrors, setAddrErrors] = useState<Record<string, string>>({});

  const ADDR_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"];

  function addrInputCls(field: string) {
    return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${addrErrors[field] ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200 focus:ring-green-500"}`;
  }

  function updateAddrField(key: keyof AddrForm, value: string) {
    setAddrForm(f => ({ ...f, [key]: value }));
    setAddrErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateAddrForm(f: AddrForm): Record<string, string> {
    const e: Record<string, string> = {};
    if (!f.firstName.trim()) e.firstName = "First name is required";
    if (!f.lastName.trim()) e.lastName = "Last name is required";
    if (f.phone && !/^[6-9]\d{9}$/.test(f.phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (!f.address1.trim()) e.address1 = "Address is required";
    if (!f.city.trim()) e.city = "City is required";
    if (!f.state) e.state = "Please select a state";
    if (!f.pincode.trim()) e.pincode = "PIN code is required";
    else if (!/^\d{6}$/.test(f.pincode)) e.pincode = "Enter a valid 6-digit PIN code";
    return e;
  }

  const loadAddresses = useCallback(async (storeId: string) => {
    const r = await fetch(`/api/storefront/customer/addresses?storeId=${storeId}`);
    if (r.ok) { const { addresses: a } = await r.json(); setAddresses(a || []); }
  }, []);

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regForm, setRegForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" });

  const loadOrders = useCallback(async (storeId: string) => {
    try {
      const ordRes = await fetch(`/api/storefront/customer/orders?storeId=${storeId}`);
      const data = await ordRes.json();
      if (data.orders) setOrders(data.orders);
    } catch { /* silent */ }
  }, []);

  const loadCustomer = useCallback(async (storeId: string) => {
    try {
      const meRes = await fetch(`/api/storefront/customer/me?storeId=${storeId}`);
      const data = await meRes.json();
      const c = data.customer;
      if (c) {
        setCustomer(c);
        setTab("orders");
        await Promise.all([loadOrders(storeId), loadAddresses(storeId)]);
      }
    } catch { /* silent */ }
  }, [loadOrders, loadAddresses]);

  useEffect(() => {
    (async () => {
      const infoRes = await fetch(`/api/storefront/storeinfo?slug=${slug}`);
      if (!infoRes.ok) { setLoading(false); return; }
      const { store: s } = await infoRes.json();
      setStore(s);
      await loadCustomer(s.id);
      setLoading(false);
    })();
  }, [slug, loadCustomer]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setAuthLoading(true);
    const res = await fetch("/api/storefront/customer/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, email: loginEmail, password: loginPassword }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setAuthLoading(false); return; }
    // Cookie is now set — set customer from response immediately, then load data
    setCustomer(d.customer);
    setTab("orders");
    await Promise.all([loadOrders(store.id), loadAddresses(store.id)]);
    setAuthLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (regForm.password !== regForm.confirmPassword) { setError("Passwords do not match"); return; }
    setAuthLoading(true);
    const res = await fetch("/api/storefront/customer/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, ...regForm }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error); setAuthLoading(false); return; }
    setCustomer(d.customer);
    setTab("orders");
    setSuccess("Account created! Welcome 🎉");
    await Promise.all([loadOrders(store.id), loadAddresses(store.id)]);
    setAuthLoading(false);
  }

  async function handleLogout() {
    await fetch(`/api/storefront/customer/login?storeId=${store.id}`, { method: "DELETE" });
    setCustomer(null); setOrders([]); setTab("login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2 text-xl font-bold text-gray-900">
            {store?.logo && <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-lg object-cover" />}
            {store?.name || slug}
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href={`/store/${slug}/search`} className="text-gray-500 hover:text-gray-800">Products</Link>
            {store?.id && <CartBadge slug={slug} storeId={store.id} />}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {customer ? (
          <div className="space-y-6">
            {/* Welcome banner */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-gray-500 mb-0.5">Welcome back</p>
                <h1 className="text-2xl font-bold text-gray-900">{customer.firstName} {customer.lastName}</h1>
                <p className="text-sm text-gray-500">{customer.email}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: "orders", label: "My Orders" },
                  { key: "addresses", label: "Addresses" },
                  { key: "profile", label: "Profile" },
                ] as { key: Tab; label: string }[]).map(({ key: t, label }) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? "bg-green-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {label}
                  </button>
                ))}
                <button onClick={handleLogout} className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50">Sign Out</button>
              </div>
            </div>

            {/* Orders Tab */}
            {tab === "orders" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Order History ({orders.length})</h2>
                </div>
                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="text-5xl mb-3">📦</div>
                    <p className="text-gray-500 mb-4">You haven&apos;t placed any orders yet</p>
                    <Link href={`/store/${slug}`} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700">Start Shopping</Link>
                  </div>
                ) : orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Order header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-wrap gap-3 bg-gray-50">
                      <div>
                        <p className="font-bold text-gray-900 font-mono">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                        <span className="font-bold text-gray-900">{formatCurrency(order.total, store.currency)}</span>
                        <Link href={`/store/${slug}/order-success?order=${order.orderNumber}&storeId=${store.id}`}
                          className="text-xs text-green-600 hover:underline font-medium">
                          View Details →
                        </Link>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="px-6 py-4 space-y-3">
                      {order.items?.map((item: { id: string; quantity: number; price: number; title: string; variantTitle?: string; variantImageUrl?: string | null; status?: string; cancelReason?: string; variant?: { title: string }; product?: { title: string; images?: { url: string }[] } }) => {
                        const isCancelled = item.status === "CANCELLED";
                        const canCancelItem = CANCELLABLE.includes(order.status) && !isCancelled;
                        const itemImg = item.variantImageUrl || item.product?.images?.[0]?.url || null;
                        return (
                          <div key={item.id} className={`flex items-center gap-4 rounded-xl p-2 -mx-2 ${isCancelled ? "opacity-50" : ""}`}>
                            <div className="w-14 h-14 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center relative">
                              {itemImg
                                ? <img src={itemImg} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xl">📦</span>}
                              {isCancelled && (
                                <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center rounded-xl">
                                  <span className="text-white text-[9px] font-bold text-center leading-tight px-1">CANCELLED</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm truncate">{item.product?.title || item.title}</p>
                              {item.variantTitle && item.variantTitle !== "Default" && <p className="text-xs text-gray-500">{item.variantTitle}</p>}
                              <p className="text-xs text-gray-400">Qty: {item.quantity} · {formatCurrency(item.price, store.currency)}</p>
                              {isCancelled && <p className="text-xs text-red-500 mt-0.5 font-medium">✕ Cancelled{item.cancelReason ? ` — ${item.cancelReason}` : ""}</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <p className={`font-bold text-sm ${isCancelled ? "line-through text-gray-400" : "text-gray-900"}`}>
                                {formatCurrency(item.price * item.quantity, store.currency)}
                              </p>
                              {canCancelItem && (
                                <button
                                  onClick={() => { setCancelItemTarget({ order, item }); setCancelItemReason(""); setCancelItemMsg(""); }}
                                  className="text-xs px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg font-semibold transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Shipment tracking */}
                    {order.shipments?.[0] && (
                      <div className="px-6 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-3">
                        <span className="text-blue-600 text-lg">🚚</span>
                        <div className="text-sm flex-1">
                          <span className="font-semibold text-blue-800">{order.shipments[0].provider || order.shipments[0].courierName}</span>
                          {order.shipments[0].trackingNumber && (
                            <> · <span className="font-mono text-blue-700">{order.shipments[0].trackingNumber}</span></>
                          )}
                          {order.shipments[0].estimatedDelivery && (
                            <span className="text-blue-600 text-xs ml-2">
                              Est. {new Date(order.shipments[0].estimatedDelivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                        {order.shipments[0].trackingUrl && (
                          <a href={order.shipments[0].trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-semibold shrink-0">
                            Track Shipment →
                          </a>
                        )}
                      </div>
                    )}

                    {/* Timeline latest */}
                    {order.timeline?.[0] && (
                      <div className="px-6 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                        <span>📌</span>
                        <span className="font-medium text-gray-700">{order.timeline[0].message}</span>
                        <span className="ml-auto">{new Date(order.timeline[0].createdAt).toLocaleDateString("en-IN")}</span>
                      </div>
                    )}

                    {/* ── Order Actions bar ── */}
                    <div className="border-t border-gray-100">
                      {/* Cancellable orders */}
                      {CANCELLABLE.includes(order.status) && (
                        <div className="px-6 py-3 flex items-center justify-between bg-amber-50 border-b border-amber-100">
                          <div>
                            <p className="text-xs font-semibold text-amber-800">Order not yet shipped</p>
                            <p className="text-xs text-amber-600 mt-0.5">You can cancel this order while it&apos;s still being processed.</p>
                          </div>
                          <button onClick={() => setCancelOrder(order)}
                            className="shrink-0 text-xs px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-semibold transition-colors ml-4">
                            ✕ Cancel Order
                          </button>
                        </div>
                      )}

                      {/* Delivered — show return window */}
                      {order.status === "DELIVERED" && (
                        <div className="px-6 py-3 flex items-center justify-between flex-wrap gap-3">
                          <div>
                            {order.returnEligible ? (
                              <>
                                <p className="text-xs font-semibold text-gray-700">Return eligible</p>
                                <p className="text-xs text-orange-600 mt-0.5 font-medium">
                                  ⏰ Return by: <span className="font-bold">{fmtDate(order.returnDeadline)}</span>
                                  <span className="text-gray-400 font-normal ml-1">({order.returnWindowDays}-day window)</span>
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs font-semibold text-gray-500">Return window closed</p>
                                {order.returnDeadline && (
                                  <p className="text-xs text-gray-400 mt-0.5">Expired on {fmtDate(order.returnDeadline)}</p>
                                )}
                              </>
                            )}
                          </div>
                          {order.returnEligible && !order.returns?.length && (
                            <button onClick={() => setReturnOrder(order)}
                              className="shrink-0 text-xs px-4 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-lg font-semibold transition-colors">
                              ↩ Return Items
                            </button>
                          )}
                          {order.returns?.length > 0 && (
                            <span className="text-xs bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-semibold">Return Requested</span>
                          )}
                        </div>
                      )}

                      {/* Already cancelled */}
                      {order.status === "CANCELLED" && (
                        <div className="px-6 py-3 bg-red-50">
                          <p className="text-xs text-red-700 font-semibold">✕ Order Cancelled</p>
                          {order.cancelReason && <p className="text-xs text-red-500 mt-0.5">Reason: {order.cancelReason}</p>}
                          <p className="text-xs text-red-400 mt-0.5">If you paid online, refund will be processed in 5–7 business days.</p>
                        </div>
                      )}

                      {/* Return submitted */}
                      {order.status === "RETURNED" && (
                        <div className="px-6 py-3 bg-rose-50">
                          <p className="text-xs text-rose-700 font-semibold">↩ Return request submitted</p>
                          {order.returns?.[0] && (
                            <p className="text-xs text-rose-500 mt-0.5 capitalize">
                              Status: {order.returns[0].status?.replace(/_/g, " ")} · Submitted {fmtDate(order.returns[0].createdAt)}
                            </p>
                          )}
                          <p className="text-xs text-rose-400 mt-0.5">We&apos;ll contact you for pickup once approved.</p>
                        </div>
                      )}

                      {/* Refunded */}
                      {order.status === "REFUNDED" && (
                        <div className="px-6 py-3 bg-pink-50">
                          <p className="text-xs text-pink-700 font-semibold">✅ Refund Processed</p>
                          <p className="text-xs text-pink-500 mt-0.5">Your refund has been initiated. Allow 5–7 business days.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Addresses Tab */}
            {tab === "addresses" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">My Addresses ({addresses.length})</h2>
                  <button onClick={() => { setAddrForm({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone || "", address1: "", address2: "", city: "", state: "", pincode: "" }); setAddrErrors({}); setShowAddrForm(true); }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">
                    + Add Address
                  </button>
                </div>

                {addresses.length === 0 && !showAddrForm && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="text-5xl mb-3">📍</div>
                    <p className="text-gray-500 mb-4">No saved addresses yet</p>
                    <button onClick={() => { setAddrForm({ firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone || "", address1: "", address2: "", city: "", state: "", pincode: "" }); setAddrErrors({}); setShowAddrForm(true); }} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700">
                      Add Your First Address
                    </button>
                  </div>
                )}

                {/* Add address form */}
                {showAddrForm && (
                  <div className="bg-white rounded-2xl border border-green-200 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">New Address</h3>

                    {/* Error summary banner */}
                    {Object.keys(addrErrors).length > 0 && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                        ⚠️ Please fix the highlighted fields before saving.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {/* First name */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={addrInputCls("firstName")}
                          value={addrForm.firstName}
                          onChange={e => updateAddrField("firstName", e.target.value)}
                          placeholder="Rahul"
                          autoComplete="given-name"
                        />
                        {addrErrors.firstName && <p className="text-xs text-red-500 mt-1">{addrErrors.firstName}</p>}
                      </div>

                      {/* Last name */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={addrInputCls("lastName")}
                          value={addrForm.lastName}
                          onChange={e => updateAddrField("lastName", e.target.value)}
                          placeholder="Sharma"
                          autoComplete="family-name"
                        />
                        {addrErrors.lastName && <p className="text-xs text-red-500 mt-1">{addrErrors.lastName}</p>}
                      </div>

                      {/* Phone */}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Mobile Number <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          className={addrInputCls("phone")}
                          value={addrForm.phone}
                          onChange={e => updateAddrField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="9876543210"
                          inputMode="numeric"
                          maxLength={10}
                          autoComplete="tel"
                        />
                        {addrErrors.phone && <p className="text-xs text-red-500 mt-1">{addrErrors.phone}</p>}
                      </div>

                      {/* Address line 1 */}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={addrInputCls("address1")}
                          value={addrForm.address1}
                          onChange={e => updateAddrField("address1", e.target.value)}
                          placeholder="Flat / House No, Street, Area"
                          autoComplete="address-line1"
                        />
                        {addrErrors.address1 && <p className="text-xs text-red-500 mt-1">{addrErrors.address1}</p>}
                      </div>

                      {/* Address line 2 */}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          className={addrInputCls("address2")}
                          value={addrForm.address2}
                          onChange={e => updateAddrField("address2", e.target.value)}
                          placeholder="Landmark, Apartment, Tower…"
                          autoComplete="address-line2"
                        />
                      </div>

                      {/* City */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={addrInputCls("city")}
                          value={addrForm.city}
                          onChange={e => updateAddrField("city", e.target.value)}
                          placeholder="Mumbai"
                          autoComplete="address-level2"
                        />
                        {addrErrors.city && <p className="text-xs text-red-500 mt-1">{addrErrors.city}</p>}
                      </div>

                      {/* State */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          className={addrInputCls("state")}
                          value={addrForm.state}
                          onChange={e => updateAddrField("state", e.target.value)}
                        >
                          <option value="">Select state…</option>
                          {ADDR_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {addrErrors.state && <p className="text-xs text-red-500 mt-1">{addrErrors.state}</p>}
                      </div>

                      {/* PIN code */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          PIN Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={addrInputCls("pincode")}
                          value={addrForm.pincode}
                          onChange={e => updateAddrField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="400001"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="postal-code"
                        />
                        {addrErrors.pincode && <p className="text-xs text-red-500 mt-1">{addrErrors.pincode}</p>}
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={async () => {
                          const errs = validateAddrForm(addrForm);
                          setAddrErrors(errs);
                          if (Object.keys(errs).length) return;
                          setAddrSaving(true);
                          await fetch("/api/storefront/customer/addresses", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ storeId: store.id, ...addrForm, isDefault: addresses.length === 0 }),
                          });
                          await loadAddresses(store.id);
                          setShowAddrForm(false);
                          setAddrErrors({});
                          setAddrSaving(false);
                        }}
                        disabled={addrSaving}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {addrSaving ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving…
                          </span>
                        ) : "Save Address"}
                      </button>
                      <button
                        onClick={() => { setShowAddrForm(false); setAddrErrors({}); }}
                        className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Saved addresses */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {addresses.map((addr: { id: string; firstName: string; lastName: string; phone?: string; address1: string; address2?: string; city: string; state: string; pincode: string; isDefault: boolean }) => (
                    <div key={addr.id} className={`bg-white rounded-2xl border-2 p-5 relative ${addr.isDefault ? "border-green-500" : "border-gray-200"}`}>
                      {addr.isDefault && (
                        <span className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">Default</span>
                      )}
                      <p className="font-bold text-gray-900 mb-1 pr-16">{addr.firstName} {addr.lastName}</p>
                      {addr.phone && <p className="text-xs text-gray-500 mb-2">📱 {addr.phone}</p>}
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}<br />
                        {addr.city}, {addr.state} – {addr.pincode}
                      </p>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                        {!addr.isDefault && (
                          <button
                            onClick={async () => {
                              await fetch(`/api/storefront/customer/addresses/${addr.id}`, {
                                method: "PATCH", headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ storeId: store.id, isDefault: true }),
                              });
                              await loadAddresses(store.id);
                            }}
                            className="text-xs text-green-600 hover:text-green-800 font-semibold"
                          >
                            Set as default
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm("Remove this address?")) return;
                            await fetch(`/api/storefront/customer/addresses/${addr.id}?storeId=${store.id}`, { method: "DELETE" });
                            await loadAddresses(store.id);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {tab === "profile" && (
              <ProfileEditPanel customer={customer} storeId={store.id} onUpdated={updated => setCustomer(updated)} />
            )}
          </div>
        ) : (
          /* Auth forms */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">👤</div>
              <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
              <p className="text-gray-500 text-sm mt-1">Sign in to view orders, track shipments and manage your profile</p>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button onClick={() => { setTab("login"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Sign In</button>
              <button onClick={() => { setTab("register"); setError(""); }} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Create Account</button>
            </div>

            {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
            {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

            {tab === "login" && (
              <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                  {authLoading ? "Signing in…" : "Sign In →"}
                </button>
              </form>
            )}

            {tab === "register" && (
              <form onSubmit={handleRegister} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.firstName} onChange={e => setRegForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Priya" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                    <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.lastName} onChange={e => setRegForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Sharma" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" required minLength={6} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <input type="password" required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" value={regForm.confirmPassword} onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter password" />
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                  {authLoading ? "Creating account…" : "Create Account →"}
                </button>
              </form>
            )}

            <p className="text-center text-xs text-gray-400 mt-4">
              <Link href={`/store/${slug}`} className="text-green-600 hover:underline">← Continue Shopping</Link>
            </p>
          </div>
        )}
      </div>

      {/* Return Modal */}
      {returnOrder && (
        <ReturnModal
          order={returnOrder}
          storeId={store.id}
          onClose={() => setReturnOrder(null)}
          onSuccess={() => {
            setReturnOrder(null);
            loadOrders(store.id);
            setSuccess("Return request submitted! We'll contact you for pickup shortly.");
          }}
        />
      )}

      {/* Cancel Order Modal */}
      {cancelOrder && (
        <CancelModal
          order={cancelOrder}
          storeId={store.id}
          onClose={() => setCancelOrder(null)}
          onSuccess={() => {
            setCancelOrder(null);
            loadOrders(store.id);
            setSuccess("Order cancelled. If you paid online, refund will be initiated in 5–7 business days.");
          }}
        />
      )}

      {/* Cancel Individual Item Modal */}
      {cancelItemTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Cancel Item</h3>
            <p className="text-sm text-gray-500 mb-4">This cannot be undone. A refund will be initiated for this item.</p>

            {/* Item preview */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                {(cancelItemTarget.item.variantImageUrl || cancelItemTarget.item.product?.images?.[0]?.url)
                  ? <img src={cancelItemTarget.item.variantImageUrl || cancelItemTarget.item.product!.images![0].url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xl">📦</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{cancelItemTarget.item.product?.title || cancelItemTarget.item.title}</p>
                {cancelItemTarget.item.variantTitle && cancelItemTarget.item.variantTitle !== "Default" && (
                  <p className="text-xs text-gray-500">{cancelItemTarget.item.variantTitle}</p>
                )}
                <p className="text-xs text-gray-400">Qty {cancelItemTarget.item.quantity} · Refund: <span className="font-semibold text-green-700">{formatCurrency(cancelItemTarget.item.price * cancelItemTarget.item.quantity, store.currency)}</span></p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for cancellation</label>
            <select
              value={cancelItemReason}
              onChange={e => setCancelItemReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:ring-2 focus:ring-red-400 focus:outline-none"
            >
              <option value="">Select a reason (optional)</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Wrong size ordered">Wrong size ordered</option>
              <option value="Found a better price">Found a better price</option>
              <option value="Ordered by mistake">Ordered by mistake</option>
              <option value="Delivery taking too long">Delivery taking too long</option>
              <option value="Other">Other</option>
            </select>

            {cancelItemMsg && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{cancelItemMsg}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setCancelItemLoading(true); setCancelItemMsg("");
                  const res = await fetch("/api/storefront/order/cancel-item", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ storeId: store.id, orderItemId: cancelItemTarget.item.id, reason: cancelItemReason }),
                  });
                  const d = await res.json();
                  setCancelItemLoading(false);
                  if (!res.ok) { setCancelItemMsg(d.error || "Failed to cancel item"); return; }
                  setCancelItemTarget(null);
                  loadOrders(store.id);
                  setSuccess(d.message);
                }}
                disabled={cancelItemLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {cancelItemLoading ? "Cancelling…" : "Yes, Cancel Item"}
              </button>
              <button
                onClick={() => setCancelItemTarget(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50"
              >
                Keep Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
