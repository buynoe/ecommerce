"use client";
import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Review = any;

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className={s <= rating ? "text-yellow-400" : "text-gray-200"} style={{ fontSize: 14 }}>★</span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/reviews?${params}`);
      const d = await r.json();
      setReviews(d.reviews || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
    } catch {
      setReviews([]);
      setTotal(0);
      setPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    await fetch(`/api/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "APPROVED" }) });
    await load();
  }

  async function reject(id: string) {
    await fetch(`/api/reviews/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "REJECTED" }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    await load();
  }

  const statusBadge = (status: string) => {
    if (status === "APPROVED") return <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">Approved</span>;
    if (status === "REJECTED") return <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">Rejected</span>;
    return <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Pending</span>;
  };

  return (
    <div>
      <PageHeader title="Product Reviews" subtitle={`${total} review${total !== 1 ? "s" : ""} total`} />

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => { setStatusFilter(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === t.key ? "btn-brand" : "text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No reviews yet</h2>
          <p className="text-gray-400 text-sm">Customer reviews will appear here once submitted</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review: Review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <StarRating rating={review.rating} />
                    {statusBadge(review.status)}
                    {review.verified && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">✓ Verified Purchase</span>
                    )}
                  </div>
                  {review.title && <p className="font-bold text-gray-900 mb-1">{review.title}</p>}
                  {review.body && <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">{review.name}</span>
                    {review.customer && <span>· {review.customer.email}</span>}
                    <span>· {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>· <a href={`/dashboard/products/${review.productId}/edit`} className="link-brand">{review.product?.title}</a></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {review.status !== "APPROVED" && (
                    <button onClick={() => approve(review.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 font-semibold">
                      ✓ Approve
                    </button>
                  )}
                  {review.status !== "REJECTED" && (
                    <button onClick={() => reject(review.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-semibold">
                      ✕ Reject
                    </button>
                  )}
                  <button onClick={() => del(review.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-semibold">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${page === i + 1 ? "btn-brand" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
