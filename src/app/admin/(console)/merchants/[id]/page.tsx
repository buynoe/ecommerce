"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Store, Package, Users, ShoppingBag, Trash2 } from "lucide-react";

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "#6366f1", BASIC: "#0891b2", PRO: "#ec1f78", ENTERPRISE: "#16a34a",
};

function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

type MerchantDetail = {
  id: string; name: string; email: string; phone: string | null;
  plan: string; planStatus: string; emailVerified: boolean;
  createdAt: string; trialEndsAt: string | null;
  store?: {
    id: string; name: string; slug: string; email: string | null;
    _count: { orders: number; products: number; customers: number };
  };
  transactions: { id: string; invoiceNumber: string; plan: string; amount: number; status: string; createdAt: string }[];
};

export default function MerchantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [m, setM] = useState<MerchantDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [plan, setPlan] = useState("");
  const [planStatus, setPlanStatus] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/merchants/${id}`)
      .then(r => r.json())
      .then(d => {
        setM(d.merchant);
        setPlan(d.merchant.plan);
        setPlanStatus(d.merchant.planStatus);
      });
  }, [id]);

  async function save() {
    setSaving(true); setMsg("");
    await fetch(`/api/admin/merchants/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, planStatus }),
    });
    setSaving(false); setMsg("Saved!");
    setTimeout(() => setMsg(""), 2000);
  }

  async function verifyEmail() {
    await fetch(`/api/admin/merchants/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailVerified: true }),
    });
    setM(prev => prev ? { ...prev, emailVerified: true } : prev);
  }

  async function deleteMerchant() {
    if (!confirm(`Delete ${m?.name}? This is permanent and cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/merchants/${id}`, { method: "DELETE" });
    router.push("/admin/merchants");
  }

  if (!m) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/merchants" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{m.name}</h1>
          <p className="text-sm text-gray-500">{m.email}</p>
        </div>
        <span className="ml-auto text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: `${PLAN_COLORS[m.plan]}18`, color: PLAN_COLORS[m.plan] }}>
          {m.plan}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Merchant info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Merchant Info</h2>
          {[
            ["Name",        m.name],
            ["Email",       m.email],
            ["Phone",       m.phone ? `+91 ${m.phone}` : "—"],
            ["Plan",        m.plan],
            ["Plan Status", m.planStatus],
            ["Joined",      new Date(m.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })],
            ["Trial Ends",  m.trialEndsAt ? new Date(m.trialEndsAt).toLocaleDateString("en-IN") : "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-900">{v}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm items-center pt-1">
            <span className="text-gray-500">Email Verified</span>
            {m.emailVerified
              ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 size={14} /> Verified</span>
              : (
                <button onClick={verifyEmail}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-medium">
                  <Clock size={13} /> Mark as verified
                </button>
              )
            }
          </div>
        </div>

        {/* Store info */}
        {m.store && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Store</h2>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Store size={20} className="text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">{m.store.name}</div>
                <a href={`/store/${m.store.slug}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">/store/{m.store.slug}</a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ShoppingBag, label: "Orders",    v: m.store._count.orders },
                { icon: Package,    label: "Products",   v: m.store._count.products },
                { icon: Users,      label: "Customers",  v: m.store._count.customers },
              ].map(({ icon: Icon, label, v }) => (
                <div key={label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <Icon size={16} className="text-gray-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-gray-900">{v}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan Management */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Plan Management</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
              {["TRIAL", "BASIC", "PRO", "ENTERPRISE"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <select value={planStatus} onChange={e => setPlanStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200">
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Transaction History</h2>
          {m.store && (
            <Link href={`/admin/merchants/${m.id}/orders`}
              className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold"
              style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
              View All Orders →
            </Link>
          )}
        </div>
        {m.transactions.length === 0
          ? <p className="text-sm text-gray-400">No transactions yet</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Invoice", "Plan", "Amount", "Status", "Date", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-400 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {m.transactions.map(tx => (
                  <tr key={tx.id}>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{tx.invoiceNumber}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${PLAN_COLORS[tx.plan]}18`, color: PLAN_COLORS[tx.plan] }}>
                        {tx.plan}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-semibold">{fmt(tx.amount)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tx.status === "SUCCESS" ? "bg-green-50 text-green-700" :
                        tx.status === "FAILED"  ? "bg-red-50 text-red-700"    : "bg-amber-50 text-amber-700"
                      }`}>{tx.status}</span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400">{new Date(tx.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="py-3">
                      {tx.status === "SUCCESS" && (
                        <button
                          onClick={() => {
                            const win = window.open("", "_blank");
                            if (!win) return;
                            const planPrice = (tx.amount / 100).toLocaleString("en-IN");
                            const gst = ((tx.amount / 100) * 0.18).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                            const total = ((tx.amount / 100) * 1.18).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                            win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${tx.invoiceNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',sans-serif; color:#111; background:#fff; padding:48px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid transparent; border-image:linear-gradient(90deg,#ec1f78,#ff6e30) 1; padding-bottom:24px; margin-bottom:32px; }
  .logo { font-size:26px; font-weight:900; background:linear-gradient(90deg,#ec1f78,#ff6e30); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f9fafb; text-align:left; padding:10px 16px; font-size:12px; font-weight:600; text-transform:uppercase; color:#6b7280; border-bottom:1px solid #e5e7eb; }
  td { padding:14px 16px; font-size:14px; border-bottom:1px solid #f3f4f6; }
  .totals { max-width:320px; margin-left:auto; margin-top:16px; }
  .tr { display:flex; justify-content:space-between; padding:7px 0; font-size:13px; color:#374151; }
  .tr.final { border-top:2px solid #ec1f78; padding-top:10px; font-size:17px; font-weight:700; }
  .footer { margin-top:48px; padding-top:20px; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#9ca3af; }
  @media print { body { padding:24px; } }
</style></head><body>
<div class="header">
  <div><div class="logo">Buynoe</div><div style="font-size:11px;color:#9ca3af">Admin Invoice</div></div>
  <div style="text-align:right">
    <h1 style="font-size:18px;font-weight:700;color:#374151">TAX INVOICE</h1>
    <p style="font-size:13px;color:#6b7280;margin-top:4px">${tx.invoiceNumber}</p>
    <p style="font-size:12px;color:#6b7280">${new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px">
  <div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Billed To</div>
    <div style="font-size:14px;font-weight:600">${m.name}</div>
    <div style="font-size:12px;color:#6b7280">${m.email}</div>
    ${m.phone ? `<div style="font-size:12px;color:#6b7280">${m.phone}</div>` : ""}
  </div>
  <div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Payment</div>
    <div style="display:inline-block;background:linear-gradient(90deg,#ec1f78,#ff6e30);color:white;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600">✓ Paid</div>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th>Plan</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody><tr>
    <td>Monthly Subscription — ${tx.plan} Plan</td>
    <td><span style="background:#fce7f3;color:#be185d;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600">${tx.plan}</span></td>
    <td style="text-align:right;font-weight:600">₹${planPrice}</td>
  </tr></tbody>
</table>
<div class="totals">
  <div class="tr"><span>Subtotal</span><span>₹${planPrice}</span></div>
  <div class="tr"><span>GST @ 18%</span><span>₹${gst}</span></div>
  <div class="tr final"><span>Total</span><span>₹${total}</span></div>
</div>
<div class="footer"><p>Buynoe · Platform subscription · Auto-generated — no signature required</p></div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
                            win.document.close();
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg text-white font-medium"
                          style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
                        >
                          Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="font-semibold text-red-600 mb-3">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently delete this merchant, their store, and all associated data. This cannot be undone.</p>
        <button onClick={deleteMerchant} disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete Merchant"}
        </button>
      </div>
    </div>
  );
}
