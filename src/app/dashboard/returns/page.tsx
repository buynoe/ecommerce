"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Undo2, Package, Truck, AlertTriangle, Check, Download, CheckCircle2, Search, DollarSign, X } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReturnItem {
  id: string;
  quantity: number;
  reason?: string | null;
  orderItem: { title: string; quantity: number; price: number };
}

interface ReturnRecord {
  id: string;
  status: string;
  reason?: string | null;
  notes?: string | null;
  refundAmount?: number | null;
  createdAt: string;
  updatedAt: string;
  order: {
    orderNumber: string;
    email: string;
    total: number;
    status: string;
    customer?: { firstName: string; lastName: string } | null;
  };
  items: ReturnItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const RETURN_STATUSES = ["", "REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUNDED", "REJECTED"];

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED:        { label: "Requested",        color: "bg-yellow-100 text-yellow-700 border-yellow-200",  icon: <Download className="w-3.5 h-3.5 inline" /> },
  APPROVED:         { label: "Approved",          color: "bg-blue-100 text-blue-700 border-blue-200",        icon: <CheckCircle2 className="w-3.5 h-3.5 inline" /> },
  PICKUP_SCHEDULED: { label: "Pickup Scheduled",  color: "bg-indigo-100 text-indigo-700 border-indigo-200",  icon: <Truck className="w-3.5 h-3.5 inline" /> },
  RECEIVED:         { label: "Received",          color: "bg-purple-100 text-purple-700 border-purple-200",  icon: <Package className="w-3.5 h-3.5 inline" /> },
  INSPECTED:        { label: "Inspected",         color: "bg-orange-100 text-orange-700 border-orange-200",  icon: <Search className="w-3.5 h-3.5 inline" /> },
  REFUNDED:         { label: "Refunded",          color: "bg-green-100 text-green-700 border-green-200",     icon: <DollarSign className="w-3.5 h-3.5 inline" /> },
  REJECTED:         { label: "Rejected",          color: "bg-red-100 text-red-700 border-red-200",           icon: <X className="w-3.5 h-3.5 inline" /> },
};

const NEXT_ACTIONS: Record<string, { label: string; status: string; color: string }[]> = {
  REQUESTED:        [{ label: "Approve Return",      status: "APPROVED",         color: "bg-blue-600 text-white hover:bg-blue-700" },
                     { label: "Reject",              status: "REJECTED",         color: "bg-red-600 text-white hover:bg-red-700" }],
  APPROVED:         [{ label: "Mark Pickup Scheduled", status: "PICKUP_SCHEDULED", color: "bg-indigo-600 text-white hover:bg-indigo-700" },
                     { label: "Reject",              status: "REJECTED",         color: "bg-red-600 text-white hover:bg-red-700" }],
  PICKUP_SCHEDULED: [{ label: "Mark Received",       status: "RECEIVED",         color: "bg-purple-600 text-white hover:bg-purple-700" }],
  RECEIVED:         [{ label: "Mark Inspected",      status: "INSPECTED",        color: "bg-orange-600 text-white hover:bg-orange-700" }],
  INSPECTED:        [{ label: "Process Refund",      status: "REFUNDED",         color: "btn-brand" },
                     { label: "Reject",              status: "REJECTED",         color: "bg-red-600 text-white hover:bg-red-700" }],
};

// ── Detail Modal ──────────────────────────────────────────────────────────────

function ReturnDetailModal({ ret, onClose, onUpdate }: { ret: ReturnRecord; onClose: () => void; onUpdate: () => void }) {
  const [notes, setNotes] = useState(ret.notes || "");
  const [refundAmount, setRefundAmount] = useState(String(ret.refundAmount ?? ret.items.reduce((s, i) => s + i.orderItem.price * i.quantity, 0)));
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(status: string) {
    setUpdating(true); setError("");
    const res = await fetch(`/api/returns/${ret.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        notes: notes || undefined,
        ...(status === "REFUNDED" && { refundAmount: parseFloat(refundAmount) || 0 }),
      }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error || "Update failed"); setUpdating(false); return; }
    setUpdating(false);
    onUpdate();
    onClose();
  }

  async function saveNotes() {
    if (!notes && !ret.notes) return;
    setUpdating(true);
    await fetch(`/api/returns/${ret.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setUpdating(false);
    onUpdate();
  }

  const m = STATUS_META[ret.status] || { label: ret.status, color: "bg-gray-100 text-gray-600", icon: "●" };
  const actions = NEXT_ACTIONS[ret.status] || [];
  const isTerminal = ["REFUNDED", "REJECTED"].includes(ret.status);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <span>{m.icon}</span> Return #{ret.id.slice(0, 8).toUpperCase()}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Order {ret.order.orderNumber} · {ret.order.customer ? `${ret.order.customer.firstName} ${ret.order.customer.lastName}` : ret.order.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${m.color}`}>{m.label}</span>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>}

            {/* Progress stepper */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Return Progress</p>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {["REQUESTED", "APPROVED", "PICKUP_SCHEDULED", "RECEIVED", "INSPECTED", "REFUNDED"].map((s, i, arr) => {
                  const statusOrder = ["REQUESTED","APPROVED","PICKUP_SCHEDULED","RECEIVED","INSPECTED","REFUNDED"];
                  const currentIdx = statusOrder.indexOf(ret.status);
                  const stepIdx = statusOrder.indexOf(s);
                  const done = stepIdx < currentIdx || ret.status === s;
                  const active = ret.status === s;
                  return (
                    <div key={s} className="flex items-center gap-1 shrink-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                        active ? "btn-brand" : done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}>
                        {done && !active ? <><Check className="w-3 h-3 inline mr-0.5" /></> : null}{STATUS_META[s]?.label || s}
                      </div>
                      {i < arr.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                    </div>
                  );
                })}
                {ret.status === "REJECTED" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-gray-300 text-xs">→</span>
                    <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1"><X className="w-3 h-3" /> Rejected</div>
                  </div>
                )}
              </div>
            </div>

            {/* Return reason */}
            {ret.reason && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 mb-0.5">Customer Reason</p>
                <p className="text-sm text-gray-800">{ret.reason}</p>
              </div>
            )}

            {/* Return items */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Items Being Returned</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {ret.items.map((item, i) => (
                  <div key={item.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.orderItem.title}</p>
                      {item.reason && item.reason !== ret.reason && <p className="text-xs text-gray-500">{item.reason}</p>}
                      <p className="text-xs text-gray-400">Qty: {item.quantity} of {item.orderItem.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 shrink-0">{formatCurrency(item.orderItem.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund amount (editable at INSPECTED stage) */}
            {(ret.status === "INSPECTED" || ret.status === "REFUNDED") && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Refund Amount (₹) {ret.status === "INSPECTED" ? <span className="text-gray-400 font-normal">— adjust if partial refund</span> : ""}
                </label>
                <input type="number" min="0" step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                  disabled={ret.status === "REFUNDED"} />
              </div>
            )}

            {/* Internal notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes <span className="text-gray-400 font-normal">optional</span></label>
              <textarea rows={2} placeholder="Add notes for your team…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none"
                value={notes} onChange={e => setNotes(e.target.value)} disabled={isTerminal} />
              {!isTerminal && notes !== (ret.notes || "") && (
                <button onClick={saveNotes} disabled={updating} className="mt-1.5 text-xs link-brand font-medium">
                  Save notes
                </button>
              )}
            </div>

            {/* Action buttons */}
            {!isTerminal && actions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Action</p>
                <div className="flex gap-3 flex-wrap">
                  {actions.map(a => (
                    <button key={a.status} onClick={() => updateStatus(a.status)} disabled={updating}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${a.color}`}>
                      {updating ? "Updating…" : a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTerminal && (
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${ret.status === "REFUNDED" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {ret.status === "REFUNDED" ? <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Refund of {formatCurrency(ret.refundAmount || 0)} processed</span> : "Return request rejected"}
              </div>
            )}

            {/* Meta */}
            <div className="text-xs text-gray-400 flex gap-4">
              <span>Submitted: {formatDate(ret.createdAt)}</span>
              <span>Updated: {formatDate(ret.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReturnRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    const r = await fetch(`/api/returns?${params}`);
    const d = await r.json();
    setReturns(d.returns || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function statusBadge(status: string) {
    const m = STATUS_META[status] || { label: status, color: "bg-gray-100 text-gray-600", icon: "●" };
    return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${m.color}`}>{m.icon} {m.label}</span>;
  }

  const PAGE_SIZE = 20;

  return (
    <div>
      <PageHeader
        title="Returns & Refunds"
        subtitle={`${total} return request${total !== 1 ? "s" : ""} total`}
      />

      {/* Workflow guide */}
      <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Return Workflow</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["REQUESTED","APPROVED","PICKUP_SCHEDULED","RECEIVED","INSPECTED","REFUNDED"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="text-xs bg-blue-200 text-blue-800 px-2.5 py-1 rounded-full font-semibold">{STATUS_META[s]?.icon} {STATUS_META[s]?.label}</span>
              {i < arr.length - 1 && <span className="text-blue-400 text-xs font-bold">→</span>}
            </span>
          ))}
          <span className="text-blue-400 text-xs font-bold">or</span>
          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><X className="w-3 h-3" /> Reject</span>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-0 mb-4 border-b border-gray-200 overflow-x-auto">
        {RETURN_STATUSES.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              statusFilter === s ? "border-green-600 text-[#ec1f78]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {s === "" ? "All Returns" : STATUS_META[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <svg className="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        ) : returns.length === 0 ? (
          <div className="p-20 text-center">
            <div className="mb-3 flex justify-center"><Undo2 className="w-14 h-14 text-gray-300" /></div>
            <p className="text-gray-600 font-semibold mb-1">No return requests</p>
            <p className="text-sm text-gray-400">
              {statusFilter ? `No returns with status "${STATUS_META[statusFilter]?.label || statusFilter}"` : "Customers can request returns from their account page after delivery."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Return ID", "Order", "Customer", "Items", "Refund Amt", "Reason", "Status", "Date", ""].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map(r => {
                    const customerName = r.order.customer
                      ? `${r.order.customer.firstName} ${r.order.customer.lastName}`
                      : r.order.email;
                    const totalRefund = r.refundAmount ?? r.items.reduce((s, i) => s + i.orderItem.price * i.quantity, 0);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#ec1f78]">{r.order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-36 truncate">{customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{r.items.length} item{r.items.length !== 1 ? "s" : ""}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(totalRefund)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-40 truncate">{r.reason || "—"}</td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button onClick={e => { e.stopPropagation(); setSelected(r); }}
                            className="text-xs link-brand font-semibold hover:underline whitespace-nowrap">
                            Manage →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">{page} / {Math.ceil(total / PAGE_SIZE)}</span>
                  <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <ReturnDetailModal
          ret={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}
