"use client";
import { useEffect, useState, use } from "react";
import { formatCurrency, formatDateTime, SHIPPING_PROVIDERS } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/types";
import Link from "next/link";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("SHIPROCKET");

  async function load() {
    const r = await fetch(`/api/orders/${id}`);
    const d = await r.json();
    setOrder(d.order);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
    setUpdating(false);
  }

  async function bookShipment() {
    setUpdating(true);
    await fetch("/api/shipping", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "book", orderId: id, provider: selectedProvider }),
    });
    await load();
    setUpdating(false);
  }

  if (loading) return <div className="p-12 text-center text-gray-400">Loading order…</div>;
  if (!order) return <div className="p-12 text-center text-red-500">Order not found</div>;

  const addr = (() => { try { return JSON.parse(order.shippingAddress); } catch { return {}; } })();

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/orders" className="text-sm text-gray-500 hover:text-gray-700">← Orders</Link>
        <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
        <span className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">Order Items</div>
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item: { id: string; imageUrl?: string; title: string; variantTitle?: string; sku?: string; price: number; quantity: number; total: number }) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          {item.variantTitle && item.variantTitle !== "Default" && <p className="text-xs text-gray-400">{item.variantTitle}</p>}
                          {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">{formatCurrency(item.price)} × {item.quantity}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-1">
              <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              {order.discountAmount > 0 && <div className="flex justify-between text-sm link-brand"><span>Discount</span><span>-{formatCurrency(order.discountAmount)}</span></div>}
              <div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>{formatCurrency(order.shippingCost)}</span></div>
              <div className="flex justify-between text-sm text-gray-600"><span>Tax (GST)</span><span>{formatCurrency(order.taxAmount)}</span></div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
            </div>
          </div>

          {/* Payment Information */}
          {order.payments?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900 flex items-center gap-2">
                💳 Payment Information
              </div>
              <div className="divide-y divide-gray-50">
                {order.payments.map((p: { id: string; status: string; amount: number; method?: string; gatewayOrderId?: string; gatewayPaymentId?: string; gatewaySignature?: string; createdAt: string; metadata?: string; gateway?: { provider: string; name: string } }) => {
                  let meta: Record<string, string> = {};
                  try { meta = JSON.parse(p.metadata || "{}"); } catch { /* ignore */ }
                  const gatewayProvider = p.gateway?.provider || meta.provider || "UNKNOWN";
                  return (
                    <div key={p.id} className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="col-span-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === "SUCCESS" ? "bg-green-100 text-green-700" : p.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {p.status}
                          </span>
                          <span className="font-bold text-gray-900">{formatCurrency(p.amount)}</span>
                        </div>
                        <span className="text-xs text-gray-400">{formatDateTime(p.createdAt)}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Payment Gateway</p>
                        <p className="font-medium text-gray-800">
                          {gatewayProvider === "RAZORPAY" ? "🟦 Razorpay" :
                           gatewayProvider === "CASHFREE" ? "🟩 Cashfree" :
                           gatewayProvider === "COD" ? "💵 Cash on Delivery" :
                           p.gateway?.name || gatewayProvider}
                        </p>
                      </div>
                      {p.method && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Payment Method</p>
                          <p className="font-medium text-gray-800">{p.method}</p>
                        </div>
                      )}
                      {p.gatewayOrderId && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Gateway Order ID</p>
                          <p className="font-mono text-xs text-gray-700 break-all">{p.gatewayOrderId}</p>
                        </div>
                      )}
                      {p.gatewayPaymentId && (
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Payment ID</p>
                          <p className="font-mono text-xs text-gray-700 break-all">{p.gatewayPaymentId}</p>
                        </div>
                      )}
                      {p.gatewaySignature && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-0.5">Signature (verified)</p>
                          <p className="font-mono text-xs text-gray-400 break-all truncate">{p.gatewaySignature}</p>
                        </div>
                      )}
                      {/* Extra metadata from Razorpay/Cashfree */}
                      {meta.vpa && <div><p className="text-xs text-gray-500 mb-0.5">UPI VPA</p><p className="font-mono text-xs text-gray-700">{meta.vpa}</p></div>}
                      {meta.bank && <div><p className="text-xs text-gray-500 mb-0.5">Bank</p><p className="text-xs text-gray-700">{meta.bank}</p></div>}
                      {meta.card_id && <div><p className="text-xs text-gray-500 mb-0.5">Card (last 4)</p><p className="text-xs text-gray-700">•••• {meta.card_last4 || "—"}</p></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No payment record yet */}
          {!order.payments?.length && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <span className="text-amber-500 text-xl">💳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Payment Pending</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {order.status === "PENDING_PAYMENT" ? "Customer has not completed payment yet." : "Payment record will appear here after gateway confirmation."}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Timeline</h2>
            <div className="space-y-3">
              {order.timeline.map((t: { id: string; status: string; message?: string; createdAt: string }) => (
                <div key={t.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ORDER_STATUS_LABELS[t.status] || t.status}</p>
                    {t.message && <p className="text-xs text-gray-500">{t.message}</p>}
                    <p className="text-xs text-gray-400">{formatDateTime(t.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <p className="text-sm font-medium text-gray-900">{order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : order.email}</p>
            <p className="text-sm text-gray-500">{order.email}</p>
            {order.phone && <p className="text-sm text-gray-500">{order.phone}</p>}
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Shipping Address</h2>
            <address className="text-sm text-gray-600 not-italic space-y-0.5">
              <p>{addr.firstName} {addr.lastName}</p>
              <p>{addr.address1}</p>
              {addr.address2 && <p>{addr.address2}</p>}
              <p>{addr.city}, {addr.state} {addr.pincode}</p>
              <p>{addr.country}</p>
            </address>
          </div>

          {/* Status Update */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
            {["CANCELLED", "REFUNDED", "RETURNED"].includes(order.status) ? (
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                order.status === "CANCELLED" ? "bg-red-50 text-red-600 border border-red-200" :
                order.status === "REFUNDED"  ? "bg-pink-50 text-pink-600 border border-pink-200" :
                "bg-rose-50 text-rose-600 border border-rose-200"
              }`}>
                {order.status === "CANCELLED" ? "✕ Order Cancelled — no further actions" :
                 order.status === "REFUNDED"  ? "💰 Refunded — no further actions" :
                 "↩ Returned — manage via Returns page"}
                {order.cancelReason && (
                  <p className="text-xs font-normal mt-1 opacity-75">Reason: {order.cancelReason}</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {((): string[] => {
                    const flow = ["PENDING_PAYMENT","PAID","CONFIRMED","PROCESSING","PACKED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED"];
                    const cancellable = ["PENDING_PAYMENT","PAID","CONFIRMED","PROCESSING","PACKED"];
                    const currentIdx = flow.indexOf(order.status);
                    const next = currentIdx >= 0 ? flow.slice(currentIdx + 1, currentIdx + 3) : ["CONFIRMED"];
                    // Only add Cancel if order hasn't shipped yet
                    if (cancellable.includes(order.status)) next.push("CANCELLED");
                    return next;
                  })().map(s => (
                    <button key={s} disabled={updating} onClick={() => updateStatus(s)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
                        s === "CANCELLED"
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-green-200 text-green-700 hover:bg-green-50 bg-green-50"
                      }`}>
                      {ORDER_STATUS_LABELS[s] || s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Current: <span className="font-medium text-gray-600">{ORDER_STATUS_LABELS[order.status] || order.status}</span></p>
              </>
            )}
          </div>

          {/* Shipping */}
          {!order.shipments?.length && order.status !== "CANCELLED" && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Book Shipment</h2>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none"
                value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}>
                {SHIPPING_PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button disabled={updating} onClick={bookShipment} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {updating ? "Booking…" : "Book Shipment"}
              </button>
            </div>
          )}

          {order.shipments?.map((s: { id: string; provider: string | null; awbCode?: string | null; trackingUrl?: string | null; status: string }) => (
            <div key={s.id} className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h2 className="font-semibold text-blue-900 mb-2">📦 Shipment</h2>
              <p className="text-sm text-blue-700">Provider: {s.provider}</p>
              <p className="text-sm text-blue-700">AWB: {s.awbCode}</p>
              <p className="text-sm text-blue-700">Status: {s.status}</p>
              {s.trackingUrl && <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">Track Package →</a>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
