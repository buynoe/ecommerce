"use client";
import { use, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { formatCurrency } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  variant: {
    title: string;
    sku?: string;
    imageUrl?: string | null;
    product: {
      title: string;
      images: { url: string; alt?: string }[];
    };
  };
}

interface Address {
  firstName: string; lastName: string; address1: string; address2?: string;
  city: string; state: string; pincode: string; phone?: string; country?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
  shipments?: { carrier?: string; trackingNumber?: string; status: string }[];
  coupon?: { code: string } | null;
}

// ─── Invoice print styles ─────────────────────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-section, #invoice-section * { visibility: visible !important; }
  #invoice-section { position: fixed; inset: 0; background: white; padding: 32px; }
  .no-print { display: none !important; }
}
`;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    CONFIRMED: "bg-blue-100 text-blue-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    SHIPPED: "bg-purple-100 text-purple-700",
    DELIVERED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAID: "bg-green-100 text-green-700",
    UNPAID: "bg-yellow-100 text-yellow-700",
    COD: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Inner content ────────────────────────────────────────────────────────────
function OrderSuccessContent({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const orderNumber = sp.get("order");
  const storeId = sp.get("storeId");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderNumber || !storeId) { setLoading(false); setNotFound(true); return; }
    fetch(`/api/storefront/order?orderNumber=${encodeURIComponent(orderNumber)}&storeId=${encodeURIComponent(storeId)}`)
      .then(r => r.json())
      .then(d => {
        if (d.order) setOrder(d.order);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [orderNumber, storeId]);

  function downloadInvoice() {
    const style = document.createElement("style");
    style.innerHTML = PRINT_STYLE;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.head.removeChild(style), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <svg className="animate-spin w-10 h-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading your order…
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-6xl">😕</div>
        <h1 className="text-2xl font-bold text-gray-800">Order not found</h1>
        <p className="text-gray-500">We couldn&apos;t find the order details. Please check your email for confirmation.</p>
        <Link href={`/store/${slug}`} className="sf-btn px-6 py-3 rounded-xl font-semibold">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const shipment = order.shipments?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/store/${slug}`} className="text-xl font-bold text-gray-900 hover:text-gray-700">
            ← Continue Shopping
          </Link>
          <button
            onClick={downloadInvoice}
            className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            📄 Download Invoice
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ── Success Banner ── */}
        <div className="bg-white rounded-2xl border border-green-200 p-8 text-center shadow-sm no-print">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">✅</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-5">
            Thank you for your purchase. We&apos;ve received your order and will start processing it shortly.
          </p>
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gray-50 rounded-xl px-6 py-4 flex-wrap justify-center">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Order Number</p>
              <p className="text-2xl font-bold text-gray-900 tracking-wider">#{order.orderNumber}</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date</p>
              <p className="font-semibold text-gray-800">
                {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</p>
              <StatusBadge status={order.status} />
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Payment</p>
              <StatusBadge status={order.paymentStatus} />
            </div>
          </div>
        </div>

        {/* ── Tracking Banner ── */}
        {shipment?.trackingNumber && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🚚</div>
              <div>
                <p className="font-semibold text-blue-900">{shipment.carrier || "Courier"} — Tracking Available</p>
                <p className="text-blue-700 text-sm font-mono">{shipment.trackingNumber}</p>
              </div>
            </div>
            <StatusBadge status={shipment.status} />
          </div>
        )}

        {/* ── PRINTABLE INVOICE ── */}
        <div ref={printRef} id="invoice-section" className="space-y-5">

          {/* Print header (hidden on screen) */}
          <div className="hidden print:flex justify-between items-start pb-6 border-b border-gray-200">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TAX INVOICE</h1>
              <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
              <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 text-lg">Buynoe India</p>
              <p className="text-sm text-gray-500">GST Compliant Invoice</p>
            </div>
          </div>

          {/* Order Items — Amazon style */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                Your Items{" "}
                <span className="text-gray-400 text-sm font-normal">
                  ({order.items.length} {order.items.length === 1 ? "item" : "items"})
                </span>
              </h2>
              <span className="text-sm text-gray-500 font-medium">Order #{order.orderNumber}</span>
            </div>

            <div className="divide-y divide-gray-100">
              {order.items.map((item) => {
                const imgUrl = item.variant.imageUrl || item.variant.product.images?.[0]?.url || null;
                const imgAlt = item.variant.product.images?.[0]?.alt || item.variant.product.title;
                const isVariant = item.variant.title && item.variant.title !== "Default" && item.variant.title !== "";
                return (
                  <div key={item.id} className="flex gap-5 p-5">
                    {/* Product Image */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt={imgAlt}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1">
                        {item.variant.product.title}
                      </h3>
                      {isVariant && (
                        <p className="text-sm text-gray-500 mb-1">
                          Variant: <span className="font-medium text-gray-700">{item.variant.title}</span>
                        </p>
                      )}
                      {item.variant.sku && (
                        <p className="text-xs text-gray-400 font-mono mb-2">SKU: {item.variant.sku}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price, order.currency)} × {item.quantity}
                      </p>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-lg">
                        {formatCurrency(item.price * item.quantity, order.currency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Address + Price Breakdown */}
          <div className="grid sm:grid-cols-2 gap-5">
            {order.shippingAddress && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📦</span> Delivering To
                </h3>
                <address className="not-italic text-sm text-gray-700 space-y-0.5 leading-relaxed">
                  <p className="font-semibold text-gray-900">{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                  <p>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
                  <p>{order.shippingAddress.country || "India"}</p>
                  {order.shippingAddress.phone && (
                    <p className="font-medium mt-1">📱 {order.shippingAddress.phone}</p>
                  )}
                </address>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>🧾</span> Price Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal, order.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>
                    {order.shippingAmount === 0
                      ? <span className="sf-text font-medium">FREE</span>
                      : formatCurrency(order.shippingAmount, order.currency)}
                  </span>
                </div>
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">
                      GST
                      <span className="text-xs sf-chip border px-1.5 py-0.5 rounded-full font-medium">Incl. in price</span>
                    </span>
                    <span>{formatCurrency(order.taxAmount, order.currency)}</span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between sf-text font-medium">
                    <span>Discount{order.coupon ? ` (${order.coupon.code})` : ""}</span>
                    <span>−{formatCurrency(order.discountAmount, order.currency)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total Paid</span>
                  <span className="sf-text">{formatCurrency(order.totalAmount, order.currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Print footer */}
          <div className="hidden print:block text-center py-6 border-t border-gray-200 text-sm text-gray-500">
            <p className="font-semibold text-gray-800 mb-1">Thank you for shopping with us!</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
        </div>

        {/* ── CTA Buttons ── */}
        <div className="no-print flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/store/${slug}`}
            className="flex items-center justify-center gap-2 sf-btn px-8 py-4 rounded-xl font-bold text-base"
          >
            🛍️ Continue Shopping
          </Link>
          <Link
            href={`/store/${slug}/account`}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-base hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            📋 View All Orders
          </Link>
          <button
            onClick={downloadInvoice}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-base hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            📄 Download Invoice
          </button>
        </div>

        {/* What happens next */}
        <div className="no-print bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">What happens next?</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: "📧", title: "Order Confirmation", desc: "You'll receive an email with order details shortly" },
              { icon: "📦", title: "Processing & Packing", desc: "We'll carefully pack your items within 1-2 business days" },
              { icon: "🚚", title: "Delivery to Your Door", desc: "Our courier will deliver at your shipping address" },
            ].map((s) => (
              <div key={s.title} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="font-semibold text-gray-800 text-sm mb-1">{s.title}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function OrderSuccessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <svg className="animate-spin w-10 h-10 mr-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading…
      </div>
    }>
      <OrderSuccessContent slug={slug} />
    </Suspense>
  );
}
