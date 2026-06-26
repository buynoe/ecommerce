"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import Script from "next/script";

interface PlanRecord {
  id: string;
  key: string;
  name: string;
  price: number;
  priceRupees: number;
  description: string;
  features: string[];
  isPopular: boolean;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

interface MerchantTransaction {
  id: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  description?: string | null;
  createdAt: string;
}

export default function BillingPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [merchant, setMerchant] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [platform, setPlatform] = useState<any>(null);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const fetchMerchant = useCallback(async () => {
    const r = await fetch("/api/store/settings");
    const d = await r.json();
    setMerchant(d.merchant);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    const r = await fetch("/api/billing/transactions");
    const d = await r.json();
    setTransactions(d.transactions || []);
    setTxLoading(false);
  }, []);

  useEffect(() => {
    fetchMerchant();
    fetchTransactions();
    fetch("/api/plans").then(r => r.json()).then(setPlans).catch(() => {});
    fetch("/api/platform/profile").then(r => r.json()).then(setPlatform).catch(() => {});
  }, [fetchMerchant, fetchTransactions]);

  async function handleUpgrade(planKey: string) {
    setError(""); setSuccess(""); setPaying(planKey);
    try {
      // 1. Create Razorpay order on server
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      // 2. Open Razorpay checkout
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Buynoe",
        description: data.planName,
        image: "/favicon.ico",
        order_id: data.orderId,
        prefill: {
          name: data.merchantName,
          email: data.merchantEmail,
        },
        theme: { color: "#ec1f78" },
        modal: {
          ondismiss: () => { setPaying(null); },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // 3. Verify payment and upgrade plan
          const verifyRes = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

          setSuccess(`🎉 Successfully upgraded to ${planKey} plan! Payment ID: ${response.razorpay_payment_id}`);
          await Promise.all([fetchMerchant(), fetchTransactions()]); // refresh plan + transactions
          setPaying(null);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: { error: { description: string } }) => {
        setError(`Payment failed: ${resp.error.description}`);
        setPaying(null);
      });
      rzp.open();
    } catch (e: unknown) {
      setError((e as Error).message);
      setPaying(null);
    }
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading…</div>;

  const currentPlan = merchant?.plan || "TRIAL";
  const planOrder = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"];
  const currentPlanIndex = planOrder.indexOf(currentPlan);

  // Show TRIAL card only when merchant is currently on trial; paid merchants cannot downgrade to free
  const visiblePlans = plans.filter(p => currentPlan === "TRIAL" ? true : p.key !== "TRIAL");

  return (
    <>
      {/* Load Razorpay script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <div>
        <PageHeader
          title="Plan & Billing"
          subtitle="Upgrade your plan to unlock more products, orders and features"
        />

        {/* Current Plan Status */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: "linear-gradient(135deg,#fff0f5,#fff5f0)", border: "1px solid #ffd6e7" }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "#ec1f78" }}>Current Plan</p>
              <h2 className="text-2xl font-black text-gray-900">{currentPlan}</h2>
              {merchant?.trialEndsAt && currentPlan === "TRIAL" && (
                <p className="text-sm mt-1" style={{ color: "#ec1f78" }}>
                  Trial ends {new Date(merchant.trialEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {currentPlan !== "TRIAL" && merchant?.planRenewsAt && (
                <p className="text-sm mt-1" style={{ color: "#ec1f78" }}>
                  ✓ Active · Renews {new Date(merchant.planRenewsAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              {currentPlan !== "TRIAL" && !merchant?.planRenewsAt && (
                <p className="text-sm mt-1" style={{ color: "#ec1f78" }}>✓ Active subscription</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Current plan features</p>
              {(() => {
                const cp = plans.find(p => p.key === currentPlan);
                return cp ? (
                  <p className="text-sm font-medium text-gray-700">{cp.features[0]}</p>
                ) : currentPlan === "TRIAL" ? (
                  <p className="text-sm font-medium text-gray-700">30-day free trial</p>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 px-4 py-4 rounded-xl text-sm font-medium text-white" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Plan Cards */}
        <div className={`grid gap-6 ${visiblePlans.length === 2 ? "md:grid-cols-2 max-w-2xl" : "md:grid-cols-3"}`}>
          {visiblePlans.length === 0 ? (
            <div className="col-span-3 py-12 text-center text-gray-400">Loading plans…</div>
          ) : visiblePlans.map((plan) => {
            const isFree = plan.price === 0;
            const isCurrentPlan = currentPlan === plan.key;
            const isDowngrade = planOrder.indexOf(plan.key) < currentPlanIndex;
            const isPaying = paying === plan.key;
            const canUpgrade = !isCurrentPlan && !isDowngrade && !isFree && scriptLoaded;

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 p-6 transition-all ${
                  isCurrentPlan
                    ? "border-transparent shadow-xl"
                    : plan.isPopular
                    ? "border-transparent shadow-lg"
                    : "border-gray-200 bg-white"
                }`}
                style={isCurrentPlan ? {
                  border: "2px solid transparent",
                  background: "linear-gradient(white,white) padding-box, linear-gradient(90deg,#ec1f78,#ff6e30) border-box",
                  boxShadow: "0 12px 40px rgba(236,31,120,0.15)",
                } : plan.isPopular ? {
                  border: "2px solid transparent",
                  background: "linear-gradient(white,white) padding-box, linear-gradient(90deg,#ec1f78,#ff6e30) border-box",
                } : {}}
              >
                {plan.isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
                    MOST POPULAR
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap" style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}>
                    CURRENT PLAN
                  </div>
                )}
                {isFree && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap border-2" style={{ color: "#ec1f78", borderColor: "#ec1f78", background: "white" }}>
                    30-DAY FREE TRIAL
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                </div>

                <div className="mb-5">
                  {isFree ? (
                    <><span className="text-3xl font-black text-gray-900">Free</span><span className="text-sm text-gray-400 ml-1">30-day trial</span></>
                  ) : (
                    <><span className="text-3xl font-black text-gray-900">₹{plan.priceRupees.toLocaleString("en-IN")}</span><span className="text-sm text-gray-400">/month</span></>
                  )}
                  {!isFree && <p className="text-xs text-gray-400 mt-0.5">+ 18% GST</p>}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="font-bold mt-0.5 shrink-0" style={{ color: "#ec1f78" }}>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => canUpgrade && handleUpgrade(plan.key)}
                  disabled={!canUpgrade || isPaying}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    isCurrentPlan || isFree
                      ? "cursor-default"
                      : !scriptLoaded
                      ? "bg-gray-100 text-gray-400 cursor-wait"
                      : "text-white hover:opacity-90"
                  }`}
                  style={
                    isCurrentPlan
                      ? { background: "linear-gradient(90deg,#ec1f78,#ff6e30)", color: "white" }
                      : isFree
                      ? { background: "#f3f4f6", color: "#9ca3af" }
                      : scriptLoaded
                      ? { background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }
                      : {}
                  }
                >
                  {isPaying ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Opening Razorpay…
                    </span>
                  ) : isCurrentPlan ? (
                    isFree ? "Active — Trial Running" : "Current Plan ✓"
                  ) : isFree ? (
                    "Not Available After Trial"
                  ) : !scriptLoaded ? (
                    "Loading…"
                  ) : (
                    `Upgrade to ${plan.name} →`
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Razorpay Badge & Info */}
        <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">🔒 Secure payments powered by Razorpay</p>
              <p className="text-xs text-gray-500">
                All payments are processed securely via Razorpay. Your card details are never stored on our servers.
                Accepts UPI, Net Banking, Credit/Debit Cards, and Wallets.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">UPI</span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">Net Banking</span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">Cards</span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded font-medium">Wallets</span>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-6 space-y-3">
          <h3 className="font-semibold text-gray-900">Frequently Asked Questions</h3>
          {[
            { q: "When will my plan be upgraded?", a: "Your plan upgrades instantly after successful payment. No waiting time." },
            { q: "Is there a refund policy?", a: "We offer a 7-day refund if you're not satisfied. Contact support@buynoe.com." },
            { q: "Can I downgrade later?", a: "Contact our support team to downgrade. Data is never deleted." },
            { q: "Are prices inclusive of GST?", a: "No, GST (18%) will be added at checkout as per Indian tax regulations." },
          ].map(({ q, a }) => (
            <div key={q} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-medium text-gray-800 text-sm mb-1">{q}</p>
              <p className="text-sm text-gray-500">{a}</p>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">🧾 Transaction History</h3>
              <p className="text-sm text-gray-500 mt-0.5">All your subscription payments and invoices</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {txLoading ? (
              <div className="p-10 text-center text-gray-400">
                <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading transactions…
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-14 text-center">
                <div className="text-5xl mb-3">🧾</div>
                <p className="text-gray-500 font-medium">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-1">Your subscription payments will appear here after your first upgrade.</p>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-mono font-medium text-gray-800">{tx.invoiceNumber}</p>
                          {tx.razorpayPaymentId && (
                            <p className="text-xs text-gray-400 mt-0.5">Razorpay: {tx.razorpayPaymentId}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-700">
                            {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(tx.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            tx.plan === "ENTERPRISE" ? "bg-purple-100 text-purple-700"
                            : tx.plan === "PRO" ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                          }`}>
                            {tx.plan}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-gray-900">
                            ₹{((tx.amount) / 100).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-gray-400">+ 18% GST</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            tx.status === "SUCCESS" ? "bg-green-100 text-green-700"
                            : tx.status === "REFUNDED" ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                          }`}>
                            {tx.status === "SUCCESS" ? "✓ Paid" : tx.status === "REFUNDED" ? "↩ Refunded" : "✗ Failed"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              const win = window.open("", "_blank");
                              if (!win) return;
                              const planPrice = (tx.amount / 100).toLocaleString("en-IN");
                              const gst = ((tx.amount / 100) * 0.18).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                              const total = ((tx.amount / 100) * 1.18).toLocaleString("en-IN", { minimumFractionDigits: 2 });
                              const pName = platform?.name || "Buynoe";
                              const pAddr = platform?.address ? `<p style="font-size:12px;color:#6b7280;margin-top:2px">${platform.address}</p>` : "";
                              const pGst = platform?.gst ? `<p style="font-size:12px;color:#6b7280">GST: ${platform.gst}</p>` : "";
                              const pEmail = platform?.contactEmail ? `<p style="font-size:12px;color:#6b7280">${platform.contactEmail}</p>` : "";
                              const mBiz = merchant?.businessName ? `<p><strong>${merchant.businessName}</strong></p>` : "";
                              const mGst = merchant?.businessGst ? `<p style="font-size:12px;color:#6b7280">GST: ${merchant.businessGst}</p>` : "";
                              const mAddr = merchant?.businessAddress ? `<p style="font-size:12px;color:#6b7280">${merchant.businessAddress}</p>` : "";
                              win.document.write(`<!DOCTYPE html><html><head><title>Invoice ${tx.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; color: #111; background: #fff; padding: 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid transparent; border-image: linear-gradient(90deg,#ec1f78,#ff6e30) 1; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 28px; font-weight: 900; background: linear-gradient(90deg,#ec1f78,#ff6e30); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .logo-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 20px; font-weight: 700; color: #374151; }
  .invoice-title p { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .section { margin-bottom: 28px; }
  .section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .detail p { font-size: 14px; color: #374151; margin-bottom: 4px; }
  .detail strong { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f9fafb; text-align: left; padding: 10px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
  .totals { margin-top: 20px; max-width: 320px; margin-left: auto; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #374151; }
  .total-row.final { border-top: 2px solid #ec1f78; margin-top: 4px; padding-top: 12px; font-size: 18px; font-weight: 700; color: #111; }
  .badge { display: inline-block; background: linear-gradient(90deg,#ec1f78,#ff6e30); color: white; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .plan-badge { background: #fce7f3; color: #be185d; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
  @media print { body { padding: 24px; } button { display: none; } }
</style></head><body>
<div class="header">
  <div>
    <div class="logo">${pName}</div>
    <div class="logo-sub">${platform?.tagline || "SaaS Ecommerce Platform"}</div>
    ${pAddr}${pGst}${pEmail}
  </div>
  <div class="invoice-title">
    <h1>TAX INVOICE</h1>
    <p>${tx.invoiceNumber}</p>
    <p>${new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
  </div>
</div>
<div class="section grid-2">
  <div class="detail">
    <h3>Billed To</h3>
    ${mBiz}
    <p><strong>${merchant?.name || "Merchant"}</strong></p>
    <p>${merchant?.email || ""}</p>
    ${mGst}${mAddr}
  </div>
  <div class="detail">
    <h3>Payment Details</h3>
    <p>Status: <span class="badge">✓ Paid</span></p>
    ${tx.razorpayPaymentId ? `<p style="margin-top:8px;font-size:12px;color:#6b7280;">Razorpay ID: ${tx.razorpayPaymentId}</p>` : ""}
    ${tx.razorpayOrderId ? `<p style="font-size:12px;color:#6b7280;">Order ID: ${tx.razorpayOrderId}</p>` : ""}
  </div>
</div>
<table>
  <thead><tr>
    <th>Description</th>
    <th>Plan</th>
    <th style="text-align:right">Amount</th>
  </tr></thead>
  <tbody><tr>
    <td>Monthly Subscription — ${tx.plan} Plan<br><span style="font-size:12px;color:#6b7280">${tx.description || ""}</span></td>
    <td><span class="plan-badge">${tx.plan}</span></td>
    <td style="text-align:right;font-weight:600">₹${planPrice}</td>
  </tr></tbody>
</table>
<div class="totals">
  <div class="total-row"><span>Subtotal</span><span>₹${planPrice}</span></div>
  <div class="total-row"><span>GST @ 18%</span><span>₹${gst}</span></div>
  <div class="total-row final"><span>Total</span><span>₹${total}</span></div>
</div>
<div class="footer">
  <p>${pName} · Platform subscription payment · All prices in INR</p>
  <p style="margin-top:6px">This is a computer-generated invoice and does not require a signature.</p>
</div>
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`);
                              win.document.close();
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white"
                            style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
                          >
                            ⬇ Invoice
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
