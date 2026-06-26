"use client";
import { use, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Suspense } from "react";
import CartBadge from "@/components/storefront/CartBadge";

interface Product {
  id: string; handle: string; title: string; vendor?: string; material?: string;
  images: { url: string }[];
  variants: { price: number; compareAtPrice?: number | null; inventoryItem?: { available: number } }[];
  collections?: { collection: { id: string; title: string } }[];
  categories?: { category: { id: string; name: string } }[];
}

interface Collection { id: string; title: string; handle: string }

type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "title_asc";

const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Relevance",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  newest: "Newest",
  title_asc: "Name A–Z",
};

type Layout = "grid" | "list";

function SearchContent({ slug }: { slug: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(sp.get("q") || "");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [layout, setLayout] = useState<Layout>("grid");

  // Filters
  const [sort, setSort] = useState<SortOption>("relevance");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [collectionId, setCollectionId] = useState("");
  const [brandFilter, setBrandFilter] = useState(sp.get("vendor") || "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [tagFilter, setTagFilter] = useState(sp.get("tag") || "");

  const loadStore = useCallback(async () => {
    const r = await fetch(`/api/storefront/storeinfo?slug=${slug}`);
    const d = await r.json();
    setStore(d.store);
    if (d.store?.id) {
      const cr = await fetch(`/api/storefront/products?storeId=${d.store.id}&limit=0`);
      const cd = await cr.json();
      setCollections(cd.collections || []);
    }
    return d.store;
  }, [slug]);

  const search = useCallback(async (q: string, s: typeof store, tag?: string, vendor?: string) => {
    if (!s) return;
    setLoading(true);
    const params = new URLSearchParams({ storeId: s.id, limit: "100" });
    if (q.trim()) params.set("search", q.trim());
    if (collectionId) params.set("collectionId", collectionId);
    if (tag) params.set("tag", tag);
    if (vendor) params.set("vendor", vendor);
    const r = await fetch(`/api/storefront/products?${params}`);
    const d = await r.json();
    setProducts(d.products || []);
    setLoading(false);
  }, [collectionId]);

  useEffect(() => {
    const initialTag = sp.get("tag") || "";
    const initialVendor = sp.get("vendor") || "";
    loadStore().then(s => {
      const q = sp.get("q") || "";
      setQuery(q);
      search(q, s, initialTag, initialVendor);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (store) search(query, store, tagFilter, brandFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, store, tagFilter, brandFilter]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setTagFilter(""); setBrandFilter(""); setCategoryFilter(""); setMaterialFilter("");
    router.push(`/store/${slug}/search?q=${encodeURIComponent(query)}`);
    if (store) search(query, store);
  }

  // Cheapest in-stock variant (or first if all OOS)
  function getDisplayVariant(p: Product) {
    const inStock = p.variants?.find(v => (v.inventoryItem?.available ?? 0) > 0);
    return inStock ?? p.variants?.[0];
  }

  // ── Facets — computed from server result (contextual to collection/search) ──
  const brandFacets = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.vendor) map.set(p.vendor, (map.get(p.vendor) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const materialFacets = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (p.material) map.set(p.material, (map.get(p.material) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const categoryFacets = useMemo(() => {
    const map = new Map<string, { title: string; count: number }>();
    for (const p of products) {
      for (const c of p.categories || []) {
        const id = c.category.id;
        map.set(id, { title: c.category.name, count: (map.get(id)?.count || 0) + 1 });
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [products]);

  // ── Client-side filter + sort ──
  const filtered = products.filter(p => {
    const dv = getDisplayVariant(p);
    const price = dv?.price || 0;
    if (priceMin && price < parseFloat(priceMin)) return false;
    if (priceMax && price > parseFloat(priceMax)) return false;
    if (inStockOnly && !p.variants?.some(v => (v.inventoryItem?.available ?? 0) > 0)) return false;
    if (categoryFilter && !p.categories?.some(c => c.category.id === categoryFilter)) return false;
    if (materialFilter && p.material !== materialFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pa = getDisplayVariant(a)?.price || 0;
    const pb = getDisplayVariant(b)?.price || 0;
    if (sort === "price_asc") return pa - pb;
    if (sort === "price_desc") return pb - pa;
    if (sort === "title_asc") return a.title.localeCompare(b.title);
    return 0;
  });

  const hasActiveFilters = !!(priceMin || priceMax || inStockOnly || collectionId || sort !== "relevance" || tagFilter || brandFilter || categoryFilter || materialFilter);

  function clearFilters() {
    setPriceMin(""); setPriceMax(""); setInStockOnly(false); setCollectionId("");
    setSort("relevance"); setTagFilter(""); setBrandFilter(""); setCategoryFilter(""); setMaterialFilter("");
  }

  // ── Shared sidebar filter content — called as a function, not a component ──
  function renderFilters(mobile = false) {
    return (
      <>
        {/* Collections — always shown */}
        {collections.length > 0 && (
          <div className={mobile ? "col-span-2" : "mb-5"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Collections</p>
            {mobile ? (
              <select value={collectionId} onChange={e => setCollectionId(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-2 text-sm">
                <option value="">All</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto">
                <button onClick={() => setCollectionId("")}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${!collectionId ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  All Products
                </button>
                {collections.map(c => (
                  <button key={c.id} onClick={() => setCollectionId(c.id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg flex items-center justify-between ${collectionId === c.id ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className="truncate">{c.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brands — only if products have vendor values */}
        {brandFacets.length > 0 && (
          <div className={mobile ? "col-span-2" : "mb-5"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brands</p>
            {mobile ? (
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-2 text-sm">
                <option value="">All Brands</option>
                {brandFacets.map(([brand, count]) => <option key={brand} value={brand}>{brand} ({count})</option>)}
              </select>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto">
                <button onClick={() => setBrandFilter("")}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${!brandFilter ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  All Brands
                </button>
                {brandFacets.map(([brand, count]) => (
                  <button key={brand} onClick={() => setBrandFilter(brandFilter === brand ? "" : brand)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 ${brandFilter === brand ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className="truncate">{brand}</span>
                    <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-full ${brandFilter === brand ? "bg-green-100" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories — only if products have categories */}
        {categoryFacets.length > 0 && (
          <div className={mobile ? "col-span-2" : "mb-5"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categories</p>
            {mobile ? (
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-2 text-sm">
                <option value="">All Categories</option>
                {categoryFacets.map(([id, { title, count }]) => <option key={id} value={id}>{title} ({count})</option>)}
              </select>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto">
                <button onClick={() => setCategoryFilter("")}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${!categoryFilter ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  All Categories
                </button>
                {categoryFacets.map(([id, { title, count }]) => (
                  <button key={id} onClick={() => setCategoryFilter(categoryFilter === id ? "" : id)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 ${categoryFilter === id ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className="truncate">{title}</span>
                    <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-full ${categoryFilter === id ? "bg-green-100" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Material — only if products have material values */}
        {materialFacets.length > 0 && (
          <div className={mobile ? "col-span-2" : "mb-5"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Material</p>
            {mobile ? (
              <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-2 text-sm">
                <option value="">All Materials</option>
                {materialFacets.map(([mat, count]) => <option key={mat} value={mat}>{mat} ({count})</option>)}
              </select>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto">
                <button onClick={() => setMaterialFilter("")}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-lg ${!materialFilter ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  All Materials
                </button>
                {materialFacets.map(([mat, count]) => (
                  <button key={mat} onClick={() => setMaterialFilter(materialFilter === mat ? "" : mat)}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded-lg flex items-center justify-between gap-1 ${materialFilter === mat ? "bg-green-50 text-green-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                    <span className="truncate">{mat}</span>
                    <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-full ${materialFilter === mat ? "bg-green-100" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Price Range */}
        <div className={mobile ? "" : "mb-5"}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price Range</p>
          <div className="flex gap-2 items-center">
            <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500 focus:outline-none" />
            <span className="text-gray-400 text-xs shrink-0">–</span>
            <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-green-500 focus:outline-none" />
          </div>
        </div>

        {/* In stock */}
        <div className={mobile ? "" : ""}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
            <span className="text-sm text-gray-700">In Stock Only</span>
          </label>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href={`/store/${slug}`} className="flex items-center gap-2 text-xl font-bold text-gray-900 shrink-0">
            {store?.logo && <img src={store.logo} alt={store.name} className="w-7 h-7 rounded-lg object-cover" />}
            {store?.name || slug}
          </Link>
          <form onSubmit={onSearch} className="flex gap-2 flex-1">
            <input
              type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search products…" autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
            <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700">Search</button>
          </form>
          <Link href={`/store/${slug}/account`} className="text-gray-600 hover:text-gray-900 shrink-0 text-sm font-medium hidden sm:block">👤</Link>
          {store?.id && <CartBadge slug={slug} storeId={store.id} />}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 sticky top-20 max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <h3 className="font-bold text-gray-900 text-sm">Filters</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Clear all</button>
              )}
            </div>
            <div className="overflow-y-auto px-5 pb-5 space-y-5 flex-1 scrollbar-thin">
              {renderFilters()}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile filter bar */}
          <div className="lg:hidden flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium shrink-0 ${hasActiveFilters ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-600"}`}>
              🎛 Filters {hasActiveFilters && <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
            </button>
            <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none">
              {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-red-500 shrink-0 hover:underline">Clear</button>}
          </div>

          {/* Mobile expanded filters */}
          {showFilters && (
            <div className="lg:hidden bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-4">
              {renderFilters(true)}
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-sm text-gray-500">
              {loading ? "Searching…" : query
                ? <><span className="font-semibold text-gray-900">{sorted.length}</span> results for &ldquo;{query}&rdquo;</>
                : <><span className="font-semibold text-gray-900">{sorted.length}</span> products</>}
            </p>
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort by:</label>
                <select value={sort} onChange={e => setSort(e.target.value as SortOption)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-green-500 focus:outline-none">
                  {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setLayout("grid")}
                  className={`px-3 py-1.5 text-sm transition-colors ${layout === "grid" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}>⊞</button>
                <button onClick={() => setLayout("list")}
                  className={`px-3 py-1.5 text-sm transition-colors border-l border-gray-200 ${layout === "list" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-50"}`}>☰</button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex gap-2 flex-wrap mb-3">
              {tagFilter && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">#{tagFilter} <button onClick={() => setTagFilter("")} className="ml-1">×</button></span>}
              {brandFilter && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">Brand: {brandFilter} <button onClick={() => setBrandFilter("")} className="ml-1">×</button></span>}
              {categoryFilter && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Category: {categoryFacets.find(([id]) => id === categoryFilter)?.[1].title} <button onClick={() => setCategoryFilter("")} className="ml-1">×</button></span>}
              {materialFilter && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Material: {materialFilter} <button onClick={() => setMaterialFilter("")} className="ml-1">×</button></span>}
              {priceMin && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Min ₹{priceMin} <button onClick={() => setPriceMin("")} className="ml-1">×</button></span>}
              {priceMax && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Max ₹{priceMax} <button onClick={() => setPriceMax("")} className="ml-1">×</button></span>}
              {inStockOnly && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">In Stock <button onClick={() => setInStockOnly(false)} className="ml-1">×</button></span>}
              {collectionId && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{collections.find(c => c.id === collectionId)?.title} <button onClick={() => setCollectionId("")} className="ml-1">×</button></span>}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-3 space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4" /><div className="h-4 bg-gray-100 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">🔍</div>
              <h2 className="text-xl font-semibold text-gray-700">{query ? `No results for "${query}"` : "No products found"}</h2>
              <p className="text-gray-400 text-sm mt-1 mb-4">Try different keywords or remove some filters</p>
              {hasActiveFilters && <button onClick={clearFilters} className="text-green-600 font-medium text-sm hover:underline">Clear all filters</button>}
            </div>
          )}

          {!loading && sorted.length > 0 && (
            layout === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {sorted.map(p => {
                  const img = p.images?.[0]?.url;
                  const v = getDisplayVariant(p);
                  const isOnSale = v?.compareAtPrice && v.compareAtPrice > v.price;
                  const discount = isOnSale ? Math.round((1 - v!.price / v!.compareAtPrice!) * 100) : 0;
                  const isOutOfStock = !p.variants?.some(vv => (vv.inventoryItem?.available ?? 0) > 0);
                  return (
                    <Link key={p.id} href={`/store/${slug}/products/${p.handle}`}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group relative">
                      {isOnSale && discount > 0 && (
                        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {discount}% OFF
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute top-2 right-2 z-10 bg-gray-700/80 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          Out of Stock
                        </div>
                      )}
                      <div className="aspect-square bg-gray-50 overflow-hidden">
                        {img
                          ? <Image src={img} alt={p.title} width={300} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          : <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>}
                      </div>
                      <div className="p-3">
                        {p.vendor && <p className="text-xs text-gray-400 mb-0.5">{p.vendor}</p>}
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{p.title}</h3>
                        {v && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="font-bold text-gray-900 text-base">{formatCurrency(v.price, store?.currency || "INR")}</span>
                            {isOnSale && <span className="text-xs text-gray-400 line-through">{formatCurrency(v.compareAtPrice!, store?.currency || "INR")}</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map(p => {
                  const img = p.images?.[0]?.url;
                  const v = getDisplayVariant(p);
                  const isOnSale = v?.compareAtPrice && v.compareAtPrice > v.price;
                  const discount = isOnSale ? Math.round((1 - v!.price / v!.compareAtPrice!) * 100) : 0;
                  const isOutOfStock = !p.variants?.some(vv => (vv.inventoryItem?.available ?? 0) > 0);
                  return (
                    <Link key={p.id} href={`/store/${slug}/products/${p.handle}`}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all flex group">
                      <div className="w-28 h-28 shrink-0 bg-gray-50 overflow-hidden relative">
                        {img
                          ? <Image src={img} alt={p.title} width={112} height={112} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🛍️</div>}
                        {isOnSale && discount > 0 && (
                          <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {discount}% OFF
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-4 flex flex-col justify-center">
                        {p.vendor && <p className="text-xs text-gray-400 mb-0.5">{p.vendor}</p>}
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">{p.title}</h3>
                        {v && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{formatCurrency(v.price, store?.currency || "INR")}</span>
                            {isOnSale && <span className="text-xs text-gray-400 line-through">{formatCurrency(v.compareAtPrice!, store?.currency || "INR")}</span>}
                          </div>
                        )}
                        {isOutOfStock && <p className="text-xs text-red-500 mt-1">Out of Stock</p>}
                      </div>
                      <div className="flex items-center px-4">
                        <span className="text-gray-300 group-hover:text-gray-600 text-lg transition-colors">→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}><SearchContent slug={slug} /></Suspense>;
}
