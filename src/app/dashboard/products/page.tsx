"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Product {
  id: string; title: string; status: string; vendor?: string; createdAt: string;
  images: { url: string }[];
  variants: { price: number; inventoryItem?: { available: number } | null }[];
  _count?: { orderItems: number };
}

type SortField = "title" | "status" | "price" | "stock" | "orders" | "createdAt";
type SortDir = "asc" | "desc";

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconSort = ({ active, dir }: { active: boolean; dir: SortDir }) => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={active ? "text-pink-500" : "text-gray-300"}>
    {active
      ? dir === "asc"
        ? <path d="M12 4l-8 8h16z"/>
        : <path d="M12 20l8-8H4z"/>
      : <><path d="M12 4l-6 6h12z"/><path d="M12 20l6-6H6z"/></>}
  </svg>
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "warning" } | null>(null);

  function showToast(msg: string, type: "success" | "warning" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), sortBy, sortDir,
      ...(search && { search }), ...(status && { status }),
    });
    const r = await fetch(`/api/products?${params}`);
    const d = await r.json();
    let prods: Product[] = d.products || [];

    // Price and stock sorted client-side (on current page)
    if (sortBy === "price") {
      prods = [...prods].sort((a, b) => {
        const pa = a.variants[0]?.price || 0, pb = b.variants[0]?.price || 0;
        return sortDir === "asc" ? pa - pb : pb - pa;
      });
    } else if (sortBy === "stock") {
      prods = [...prods].sort((a, b) => {
        const sa = a.variants.reduce((s, v) => s + (v.inventoryItem?.available || 0), 0);
        const sb = b.variants.reduce((s, v) => s + (v.inventoryItem?.available || 0), 0);
        return sortDir === "asc" ? sa - sb : sb - sa;
      });
    }

    setProducts(prods);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search, status, sortBy, sortDir]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function toggleSort(field: SortField) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    const { id } = deleteModal;
    setDeleteModal(null);
    const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const d = await r.json();
    showToast(d.message, d.archived ? "warning" : "success");
    fetch_();
  }

  function SortTh({ field, label, align = "left" }: { field: SortField; label: string; align?: "left" | "right" }) {
    const active = sortBy === field;
    return (
      <th
        onClick={() => toggleSort(field)}
        className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      >
        <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
          {label} <IconSort active={active} dir={sortDir} />
        </span>
      </th>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white transition-all ${toast.type === "warning" ? "bg-amber-500" : "bg-green-600"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === "warning" ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></> : <polyline points="20 6 9 17 4 12"/>}
          </svg>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <IconTrash />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-1">
              <span className="font-semibold text-gray-800">&ldquo;{deleteModal.title}&rdquo;</span>
            </p>
            <p className="text-xs text-gray-400 text-center mb-6">
              If this product has order history it will be archived and hidden from your store instead of permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader title="Products" subtitle={`${total} products`}
        action={<Link href="/dashboard/products/new" className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">+ Add Product</Link>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search products…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-pink-500 focus:outline-none" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-400">Loading…</div>
          : products.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-gray-500 mb-4">No products yet</p>
              <Link href="/dashboard/products/new" className="btn-brand px-4 py-2 rounded-lg text-sm font-medium">Add your first product</Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <SortTh field="title" label="Product" />
                      <SortTh field="status" label="Status" />
                      <SortTh field="price" label="Price" align="right" />
                      <SortTh field="stock" label="Stock" align="right" />
                      <SortTh field="orders" label="Orders" align="right" />
                      <SortTh field="createdAt" label="Added" align="right" />
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(p => {
                      const price = p.variants[0]?.price || 0;
                      const stock = p.variants.reduce((s, v) => s + (v.inventoryItem?.available || 0), 0);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                {p.images[0] ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">📦</span>}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{p.title}</p>
                                {p.vendor && <p className="text-xs text-gray-400">{p.vendor}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : p.status === "DRAFT" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatCurrency(price)}</td>
                          <td className="px-6 py-4 text-right text-sm">
                            <span className={stock <= 5 ? "text-red-600 font-semibold" : "text-gray-700"}>{stock}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm">
                            {(p._count?.orderItems || 0) > 0
                              ? <span className="font-semibold text-green-700">{p._count?.orderItems}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Link href={`/dashboard/products/${p.id}/edit`}
                                className="inline-flex items-center gap-1 text-xs link-brand font-medium hover:underline">
                                <IconEdit /> Edit
                              </Link>
                              <button onClick={() => setDeleteModal({ id: p.id, title: p.title })}
                                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium hover:underline">
                                <IconTrash /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {total > 20 && (
                <div className="flex justify-center gap-2 p-4 border-t border-gray-100">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-40">← Prev</button>
                  <span className="px-3 py-1 text-sm text-gray-600">{page} / {Math.ceil(total / 20)}</span>
                  <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-40">Next →</button>
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}
