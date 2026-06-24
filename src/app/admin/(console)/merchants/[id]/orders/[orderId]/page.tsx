"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CreditCard, User, MapPin, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PAID: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PACKED: "bg-purple-50 text-purple-700 border-purple-200",
  SHIPPED: "bg-cyan-50 text-cyan-700 border-cyan-200",
  OUT_FOR_DELIVERY: "bg-teal-50 text-teal-700 border-teal-200",
  DELIVERED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  REFUNDED: "bg-amber-50 text-amber-700 border-amber-200",
  RETURNED: "bg-orange-50 text-orange-700 border-orange-200",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;

export default function OrderDetailPage() {
  const { id, orderId } = useParams<{ id: string; orderId: string }>();
  const [order, setOrder] = useState<Order>(null);
  const [merchantName, setMerchantName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/merchants/${id}/orders/${orderId}`)
      .then(r => r.json())
      .then(d => {
        setOrder(d.order);
        setMerchantName(d.merchant?.name || "");
        setLoading(false);
      });
  }, [id, orderId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (!order) return <div className="p-8 text-red-500 text-sm">Order not found.</div>;

  const addr = (() => {
    try {
      const a = JSON.parse(order.shippingAddress || "{}");
      const parts = [a.address1, a.address2, a.city, a.state, a.zip, a.country].filter(Boolean);
      return parts.length ? parts.join(", ") : null;
    } catch { return null; }
  })();

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/merchants/${id}/orders`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
              {order.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {merchantName} · {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={() => {
            const win = window.open("", "_blank");
            if (!win) return;
            const items = (order.items || []).map((it: Order) => `
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6">${it.title}${it.variantTitle ? ` — ${it.variantTitle}` : ""}${it.sku ? `<br><span style="color:#9ca3af;font-size:11px">SKU: ${it.sku}</span>` : ""}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:center">${it.quantity}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right">₹${it.price.toLocaleString("en-IN")}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">₹${(it.price * it.quantity).toLocaleString("en-IN")}</td>
              </tr>`).join("");
            const payMethod = order.payments?.[0]?.method || "";
            const txId = order.payments?.[0]?.gatewayPaymentId || "";
            win.document.write(`<!DOCTYPE html><html><head><title>Order ${order.orderNumber}</title>
<style>* { margin:0;padding:0;box-sizing:border-box; } body { font-family:'Segoe UI',sans-serif;color:#111;background:#fff;padding:40px; } .logo { font-size:24px;font-weight:900;background:linear-gradient(90deg,#ec1f78,#ff6e30);-webkit-background-clip:text;-webkit-text-fill-color:transparent; } table { width:100%;border-collapse:collapse; } th { background:#f9fafb;text-align:left;padding:9px 14px;font-size:11px;font-weight:600;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb; } .tr { display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#374151; } .tr.final { border-top:2px solid #ec1f78;padding-top:10px;font-size:16px;font-weight:700; } @media print { button{display:none} }</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid transparent;border-image:linear-gradient(90deg,#ec1f78,#ff6e30) 1;padding-bottom:20px;margin-bottom:24px">
  <div><div class="logo">Buynoe</div><div style="font-size:11px;color:#9ca3af">Order Invoice</div></div>
  <div style="text-align:right"><div style="font-size:18px;font-weight:700;color:#374151">${order.orderNumber}</div><div style="font-size:12px;color:#6b7280;margin-top:4px">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
  <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Customer</div>
    <div style="font-size:14px;font-weight:600">${order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : order.email}</div>
    <div style="font-size:12px;color:#6b7280">${order.email}</div>
    ${order.phone ? `<div style="font-size:12px;color:#6b7280">${order.phone}</div>` : ""}
    ${addr ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${addr}</div>` : ""}
  </div>
  <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Payment</div>
    ${payMethod ? `<div style="font-size:13px;font-weight:600">${payMethod}</div>` : ""}
    ${txId ? `<div style="font-size:11px;color:#6b7280;word-break:break-all">TXN: ${txId}</div>` : ""}
  </div>
</div>
<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
<tbody>${items}</tbody></table>
<div style="max-width:300px;margin-left:auto;margin-top:16px">
  <div class="tr"><span>Subtotal</span><span>₹${order.subtotal?.toLocaleString("en-IN")}</span></div>
  ${order.discountAmount > 0 ? `<div class="tr" style="color:#16a34a"><span>Discount</span><span>−₹${order.discountAmount?.toLocaleString("en-IN")}</span></div>` : ""}
  ${order.shippingCost > 0 ? `<div class="tr"><span>Shipping</span><span>₹${order.shippingCost?.toLocaleString("en-IN")}</span></div>` : ""}
  ${order.taxAmount > 0 ? `<div class="tr"><span>Tax</span><span>₹${order.taxAmount?.toLocaleString("en-IN")}</span></div>` : ""}
  <div class="tr final"><span>Total</span><span>₹${order.total?.toLocaleString("en-IN")}</span></div>
</div>
<div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af"><p>Buynoe · Auto-generated — no signature required</p></div>
<script>window.onload=function(){window.print()}<\/script></body></html>`);
            win.document.close();
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl"
          style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
        >
          Print Invoice
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <User size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</span>
          </div>
          {order.customer ? (
            <>
              <p className="font-semibold text-gray-900 text-sm">{order.customer.firstName} {order.customer.lastName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{order.customer.email}</p>
              {order.customer.phone && <p className="text-xs text-gray-500">{order.customer.phone}</p>}
            </>
          ) : (
            <>
              <p className="font-semibold text-gray-900 text-sm">Guest</p>
              <p className="text-xs text-gray-500">{order.email}</p>
              {order.phone && <p className="text-xs text-gray-500">{order.phone}</p>}
            </>
          )}
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ship To</span>
          </div>
          {addr ? (
            <p className="text-sm text-gray-700 leading-relaxed">{addr}</p>
          ) : (
            <p className="text-xs text-gray-400">No address provided</p>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</span>
          </div>
          {order.payments?.length > 0 ? order.payments.map((p: Order) => (
            <div key={p.id} className="text-sm space-y-0.5">
              <p className="font-semibold text-gray-900">{p.method || "—"}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "SUCCESS" ? "bg-green-100 text-green-700" : p.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{p.status}</span>
              <p className="text-xs text-gray-500 font-semibold mt-1">₹{p.amount?.toLocaleString("en-IN")}</p>
              {p.gatewayPaymentId && <p className="text-xs text-gray-400 font-mono break-all">{p.gatewayPaymentId}</p>}
            </div>
          )) : <p className="text-xs text-gray-400">No payment recorded</p>}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Package size={15} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Items ({order.items?.length || 0})</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Product", "SKU", "Qty", "Unit Price", "Discount", "Tax", "Total"].map(h => (
                <th key={h} className={`text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide ${["Qty", "Unit Price", "Discount", "Tax", "Total"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(order.items || []).map((item: Order) => (
              <tr key={item.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3.5">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  {item.variantTitle && <p className="text-xs text-gray-400 mt-0.5">{item.variantTitle}</p>}
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{item.sku || "—"}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-gray-800">{item.quantity}</td>
                <td className="px-5 py-3.5 text-right text-gray-700">₹{item.price?.toLocaleString("en-IN")}</td>
                <td className="px-5 py-3.5 text-right text-green-600 text-xs">
                  {item.discountAmount > 0 ? `−₹${item.discountAmount?.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="px-5 py-3.5 text-right text-xs text-gray-500">
                  {item.taxAmount > 0 ? `₹${item.taxAmount?.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-gray-900">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-100 px-5 py-4 flex justify-end">
          <div className="space-y-1.5 min-w-48">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>₹{order.subtotal?.toLocaleString("en-IN")}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount {order.coupon?.code ? `(${order.coupon.code})` : ""}</span>
                <span>−₹{order.discountAmount?.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span><span>₹{order.shippingCost?.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span><span>₹{order.taxAmount?.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
              <span>Total</span><span>₹{order.total?.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments */}
      {order.shipments?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Shipments</span>
          </div>
          <div className="space-y-3">
            {order.shipments.map((s: Order) => (
              <div key={s.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl text-sm">
                <div>
                  <p className="font-medium text-gray-900">{s.carrier || "—"}</p>
                  {s.trackingNumber && <p className="text-xs text-gray-500 font-mono">{s.trackingNumber}</p>}
                </div>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-medium">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {order.timeline?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Timeline</span>
          </div>
          <div className="space-y-3">
            {order.timeline.map((t: Order) => (
              <div key={t.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-pink-400 mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium text-gray-900">{t.status.replace(/_/g, " ")}</span>
                  {t.message && <span className="text-gray-500"> — {t.message}</span>}
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Order Notes</p>
          <p className="text-sm text-amber-800">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
