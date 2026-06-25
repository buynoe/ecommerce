"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

interface Product { id: string; title: string; status: string; vendor?: string; images: { url: string }[]; variants: { price: number; inventoryItem?: { available: number } | null }[]; _count?: { variants: number; orderItems: number } }

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(search && { search }), ...(status && { status }) });
    const r = await fetch(`/api/products?${params}`);
    const d = await r.json();
    setProducts(d.products || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? If it has order history it will be archived instead of permanently deleted.")) return;
    const r = await fetch(`/api/products/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.archived) alert(d.message);
    fetch_();
  }

  return (
    <div>
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th>
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
                          {(p._count?.orderItems || 0) > 0 ? (
                            <span className="font-semibold text-green-700">{p._count?.orderItems}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <Link href={`/dashboard/products/${p.id}/edit`} className="text-xs link-brand font-medium">Edit</Link>
                            <button onClick={() => deleteProduct(p.id)} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
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
