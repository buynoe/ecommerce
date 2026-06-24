"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CartBadge from "@/components/storefront/CartBadge";

export default function CollectionPage({ params }: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug, handle } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const infoRes = await fetch(`/api/storefront/storeinfo?slug=${slug}`);
      if (!infoRes.ok) { setLoading(false); return; }
      const { store } = await infoRes.json();
      const r = await fetch(`/api/storefront/products?storeId=${store.id}&collectionHandle=${handle}&limit=48`);
      const d = await r.json();
      setData({ store, ...d });
      setLoading(false);
    })();
  }, [slug, handle]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2 text-xl font-bold text-gray-900">
            {data?.store?.logo && <img src={data.store.logo} alt={data.store.name} className="w-7 h-7 rounded-lg object-cover" />}
            {data?.store?.name || slug}
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href={`/store/${slug}/search`} className="hover:text-gray-900">Search</Link>
            {data?.store?.id && <CartBadge slug={slug} storeId={data.store.id} />}
          </nav>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link href={`/store/${slug}`} className="text-sm text-gray-500 hover:text-gray-700">← All Collections</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{handle.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</h1>
          <p className="text-sm text-gray-500">{data?.total || 0} products</p>
        </div>
        {!data?.products?.length ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-gray-500">No products in this collection</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.products.map((p: { id: string; handle: string; title: string; vendor: string; images: { url: string }[]; variants: { price: number; compareAtPrice?: number }[] }) => {
              const img = p.images?.[0]?.url;
              const v = p.variants?.[0];
              return (
                <Link key={p.id} href={`/store/${slug}/products/${p.handle}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {img ? <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{p.vendor}</p>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{p.title}</h3>
                    {v && (
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="font-bold text-gray-900">{formatCurrency(v.price, "INR")}</span>
                        {v.compareAtPrice && v.compareAtPrice > v.price && <span className="text-xs text-gray-400 line-through">{formatCurrency(v.compareAtPrice, "INR")}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
