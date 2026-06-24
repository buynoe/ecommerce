"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Download, Filter } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-50 text-yellow-700",
  PAID: "bg-blue-50 text-blue-700",
  CONFIRMED: "bg-blue-50 text-blue-700",
  PROCESSING: "bg-indigo-50 text-indigo-700",
  PACKED: "bg-purple-50 text-purple-700",
  SHIPPED: "bg-cyan-50 text-cyan-700",
  OUT_FOR_DELIVERY: "bg-teal-50 text-teal-700",
  DELIVERED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  REFUNDED: "bg-amber-50 text-amber-700",
  RETURNED: "bg-orange-50 text-orange-700",
  DRAFT: "bg-gray-100 text-gray-500",
};

const ALL_STATUSES = [
  "DRAFT", "PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING",
  "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED", "RETURNED",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = any;

export default function MerchantOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [merchantName, setMerchantName] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ q, status, dateFrom, dateTo, page: String(pg) });
    const r = await fetch(`/api/admin/merchants/${id}/orders?${params}`);
    const d = await r.json();
    setOrders(d.orders ?? []);
    setTotal(d.total ?? 0);
    setPages(d.pages ?? 1);
    setLoading(false);
  }, [id, q, status, dateFrom, dateTo]);

  useEffect(() => {
    fetch(`/api/admin/merchants/${id}`).then(r => r.json()).then(d => setMerchantName(d.merchant?.name || ""));
  }, [id]);

  useEffect(() => { setPage(1); }, [q, status, dateFrom, dateTo]);
  useEffect(() => { load(page); }, [page, load]);

  async function exportExcel() {
    if (!orders.length) return;
    const XLSX = await import("xlsx");
    const rows = orders.map((o: Order) => ({
      "Order #": o.orderNumber,
      "Date": new Date(o.createdAt).toLocaleDateString("en-IN"),
      "Customer": o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : "Guest",
      "Email": o.email,
      "Phone": o.phone || "",
      "Status": o.status.replace(/_/g, " "),
      "Items": o.items?.length || 0,
      "Subtotal": o.subtotal,
      "Discount": o.discountAmount,
      "Shipping": o.shippingCost,
      "Tax": o.taxAmount,
      "Total": o.total,
      "Payment Method": o.payments?.[0]?.method || "",
      "Transaction ID": o.payments?.[0]?.gatewayPaymentId || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders-${merchantName.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function openOrderInvoice(o: Order) {
    const win = window.open("", "_blank");
    if (!win) return;
    const items = (o.items || []).map((it: Order) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6">${it.title}${it.variantTitle ? ` — ${it.variantTitle}` : ""}${it.sku ? `<br><span style="color:#9ca3af;font-size:11px">SKU: ${it.sku}</span>` : ""}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:center">${it.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right">₹${it.price.toLocaleString("en-IN")}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600">₹${(it.price * it.quantity).toLocaleString("en-IN")}</td>
      </tr>`).join("");

    const addr = (() => { try { const a = JSON.parse(o.shippingAddress); return a.address1 ? `${a.address1}, ${a.city}, ${a.state} ${a.zip}` : ""; } catch { return ""; } })();
    const txId = o.payments?.[0]?.gatewayPaymentId || "";
    const payMethod = o.payments?.[0]?.method || "";

    win.document.write(`<!DOCTYPE html><html><head><title>Order ${o.orderNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',sans-serif; color:#111; background:#fff; padding:40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid transparent; border-image:linear-gradient(90deg,#ec1f78,#ff6e30) 1; padding-bottom:20px; margin-bottom:28px; }
  .logo { font-size:24px; font-weight:900; background:linear-gradient(90deg,#ec1f78,#ff6e30); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; }
  table { width:100%; border-collapse:collapse; }
  th { background:#f9fafb; text-align:left; padding:9px 14px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#6b7280; border-bottom:1px solid #e5e7eb; }
  .totals { max-width:300px; margin-left:auto; margin-top:16px; }
  .tr { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#374151; }
  .tr.final { border-top:2px solid #ec1f78; margin-top:4px; padding-top:10px; font-size:16px; font-weight:700; }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af; }
  @media print { button { display:none; } }
</style></head><body>
<div class="header">
  <div><div class="logo">Buynoe</div><div style="font-size:11px;color:#9ca3af;margin-top:2px">Order Invoice</div></div>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:700;color:#374151">${o.orderNumber}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">${new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
    <div style="margin-top:6px"><span class="badge" style="background:#fce7f3;color:#be185d">${o.status.replace(/_/g, " ")}</span></div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
  <div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Customer</div>
    <div style="font-size:14px;font-weight:600">${o.customer?.name || o.email}</div>
    <div style="font-size:12px;color:#6b7280">${o.email}</div>
    ${o.phone ? `<div style="font-size:12px;color:#6b7280">${o.phone}</div>` : ""}
    ${addr ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${addr}</div>` : ""}
  </div>
  <div>
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:6px">Payment</div>
    ${payMethod ? `<div style="font-size:13px;font-weight:600">${payMethod}</div>` : ""}
    ${txId ? `<div style="font-size:11px;color:#6b7280;word-break:break-all">TXN: ${txId}</div>` : ""}
  </div>
</div>
<table>
  <thead><tr>
    <th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
  </tr></thead>
  <tbody>${items}</tbody>
</table>
<div class="totals">
  <div class="tr"><span>Subtotal</span><span>₹${o.subtotal?.toLocaleString("en-IN") || 0}</span></div>
  ${o.discountAmount > 0 ? `<div class="tr" style="color:#16a34a"><span>Discount</span><span>−₹${o.discountAmount?.toLocaleString("en-IN")}</span></div>` : ""}
  ${o.shippingCost > 0 ? `<div class="tr"><span>Shipping</span><span>₹${o.shippingCost?.toLocaleString("en-IN")}</span></div>` : ""}
  ${o.taxAmount > 0 ? `<div class="tr"><span>Tax</span><span>₹${o.taxAmount?.toLocaleString("en-IN")}</span></div>` : ""}
  <div class="tr final"><span>Total</span><span>₹${o.total?.toLocaleString("en-IN") || 0}</span></div>
</div>
<div class="footer">
  <p>Buynoe · This invoice is auto-generated and does not require a signature</p>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admin/merchants/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Orders — {merchantName}</h1>
          <p className="text-sm text-gray-500">{total} total orders</p>
        </div>
        <button
          onClick={exportExcel}
          disabled={!orders.length}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-40"
          style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
        >
          <Download size={14} /> Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={14} /> Filters
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Order #, customer email/phone, transaction ID…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          <span className="self-center text-gray-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          {(q || status || dateFrom || dateTo) && (
            <button onClick={() => { setQ(""); setStatus(""); setDateFrom(""); setDateTo(""); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Order #", "Date", "Customer", "Items", "Status", "Total", "Payment", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No orders found</td></tr>
              ) : orders.map((o: Order) => (
                <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-gray-800">{o.orderNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : "Guest"}</div>
                    <div className="text-xs text-gray-400">{o.email}</div>
                    {o.phone && <div className="text-xs text-gray-400">{o.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-700">{o.items?.length || 0} item{o.items?.length !== 1 ? "s" : ""}</div>
                    <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {o.items?.slice(0, 2).map((it: Order) => it.title).join(", ")}
                      {o.items?.length > 2 ? ` +${o.items.length - 2}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-500"}`}>
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">₹{o.total?.toLocaleString("en-IN")}</div>
                    {o.discountAmount > 0 && <div className="text-xs text-green-600">−₹{o.discountAmount?.toLocaleString("en-IN")}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {o.payments?.[0] ? (
                      <>
                        <div className="text-xs font-medium text-gray-700">{o.payments[0].method}</div>
                        {o.payments[0].transactionId && (
                          <div className="text-xs text-gray-400 font-mono truncate max-w-24" title={o.payments[0].transactionId}>
                            {o.payments[0].transactionId}
                          </div>
                        )}
                      </>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/merchants/${id}/orders/${o.id}`}
                        className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => openOrderInvoice(o)}
                        className="text-xs px-2.5 py-1 rounded-lg text-white transition-colors"
                        style={{ background: "linear-gradient(90deg,#ec1f78,#ff6e30)" }}
                      >
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {page} of {pages} · {total} orders</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
