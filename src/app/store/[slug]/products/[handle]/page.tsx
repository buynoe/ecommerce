"use client";
import { use, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import CartBadge from "@/components/storefront/CartBadge";

interface Variant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  options: string; // JSON: {"Size":"M","Color":"Blue"}
  imageUrl?: string | null;
  inventoryItem?: { available: number; trackInventory?: boolean } | null;
}

interface ProductImage { id: string; url: string; alt?: string }

interface Product {
  id: string;
  title: string;
  description?: string;
  bodyHtml?: string;
  vendor?: string;
  tags?: string;
  gstRate?: number;
  gstIncluded?: boolean;
  variants: Variant[];
  images: ProductImage[];
  collections?: { collectionId: string }[];
}

interface RelatedProduct {
  id: string; handle: string; title: string; vendor?: string;
  images: { url: string }[];
  variants: { price: number; compareAtPrice?: number | null; inventoryItem?: { available: number } }[];
}

// ── Image Zoom Lightbox ───────────────────────────────────────────────────────

function ImageZoom({
  images, startIndex, alt, onClose,
}: {
  images: { url: string }[];
  startIndex: number;
  alt: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const total = images.length;
  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + total) % total);
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % total);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, total]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        ×
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/40 px-3 py-1 rounded-full">
          {idx + 1} / {total}
        </div>
      )}

      {/* Prev */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl transition-colors z-10"
        >
          ‹
        </button>
      )}

      {/* Main image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[idx].url}
        alt={`${alt} — photo ${idx + 1}`}
        className="max-h-[88vh] max-w-[88vw] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />

      {/* Next */}
      {total > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white text-2xl transition-colors z-10"
        >
          ›
        </button>
      )}

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-2"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Product Page ─────────────────────────────────────────────────────────

export default function ProductPage({ params }: { params: Promise<{ slug: string; handle: string }> }) {
  const { slug, handle } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [store, setStore] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [featImg, setFeatImg] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showBreakup, setShowBreakup] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  // For reviews: check if customer is logged in
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [loggedInCustomer, setLoggedInCustomer] = useState<any>(null);
  const [customerChecked, setCustomerChecked] = useState(false);

  useEffect(() => {
    fetch(`/api/storefront/product?slug=${slug}&handle=${handle}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setProduct(d.product);
        setStore(d.store);
        // Default to cheapest in-stock variant (matches what product listing shows)
        const cheapestInStock = d.product.variants.find(
          (v: { inventoryItem?: { available: number } }) => (v.inventoryItem?.available ?? 0) > 0
        );
        const defaultVariant = cheapestInStock || d.product.variants[0];
        setFeatImg(defaultVariant?.imageUrl || d.product.images[0]?.url || null);
        if (defaultVariant) {
          try {
            const opts: Record<string, string> = JSON.parse(defaultVariant.options || "{}");
            if (Object.keys(opts).length > 0) setSelectedOptions(opts);
          } catch { /* single variant */ }
        }
      });
  }, [slug, handle]);

  // Fetch related products once product + store are loaded
  useEffect(() => {
    if (!product || !store?.id) return;
    const collectionId = product.collections?.[0]?.collectionId;
    const params = new URLSearchParams({ storeId: store.id, limit: "12" });
    if (collectionId) params.set("collectionId", collectionId);
    else if (product.vendor) params.set("vendor", product.vendor);
    fetch(`/api/storefront/products?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.products) return;
        // Exclude current product, cap at 10
        const filtered = (d.products as RelatedProduct[]).filter(p => p.id !== product.id).slice(0, 10);
        // If collection gave < 6, top up with vendor products
        if (filtered.length < 6 && collectionId && product.vendor) {
          const vendorParams = new URLSearchParams({ storeId: store.id, limit: "12", vendor: product.vendor });
          fetch(`/api/storefront/products?${vendorParams}`)
            .then(r => r.ok ? r.json() : null)
            .then(vd => {
              if (!vd?.products) return;
              const existing = new Set(filtered.map((p: RelatedProduct) => p.id));
              existing.add(product.id);
              const extra = (vd.products as RelatedProduct[]).filter(p => !existing.has(p.id));
              setRelatedProducts([...filtered, ...extra].slice(0, 10));
            }).catch(() => {});
        } else {
          setRelatedProducts(filtered);
        }
      }).catch(() => {});
  }, [product?.id, store?.id]);

  // Check customer login state for reviews
  useEffect(() => {
    if (!store?.id) return;
    fetch(`/api/storefront/customer/me?storeId=${store.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setLoggedInCustomer(d?.customer ?? null); setCustomerChecked(true); })
      .catch(() => setCustomerChecked(true));
  }, [store?.id]);

  // Build unified gallery: variant images keyed by their url, then product-level images
  // Each entry carries which variant it belongs to (for label display)
  const galleryImages = useMemo(() => {
    if (!product) return [] as { url: string; variantLabel?: string }[];
    const seen = new Set<string>();
    const list: { url: string; variantLabel?: string }[] = [];
    for (const v of product.variants) {
      if (v.imageUrl && !seen.has(v.imageUrl)) {
        seen.add(v.imageUrl);
        // Build a short label from the variant options, e.g. "Red / XL"
        let label = v.title;
        try {
          const opts = JSON.parse(v.options || "{}") as Record<string, string>;
          const vals = Object.values(opts).filter(Boolean);
          if (vals.length) label = vals.join(" / ");
        } catch { /* use title */ }
        list.push({ url: v.imageUrl, variantLabel: label });
      }
    }
    for (const img of product.images) {
      if (!seen.has(img.url)) {
        seen.add(img.url);
        list.push({ url: img.url });
      }
    }
    return list;
  }, [product]);

  // Group all option values across variants
  const optionGroups = useMemo(() => {
    if (!product) return [];
    const groups: Record<string, Set<string>> = {};
    for (const v of product.variants) {
      try {
        const opts: Record<string, string> = JSON.parse(v.options || "{}");
        for (const [key, val] of Object.entries(opts)) {
          if (!groups[key]) groups[key] = new Set();
          if (val) groups[key].add(val);
        }
      } catch { /* ignore */ }
    }
    return Object.entries(groups).map(([name, vals]) => ({ name, values: Array.from(vals) }));
  }, [product]);

  const hasOptions = optionGroups.length > 0;

  // Find the variant matching all currently selected option values
  const selectedVariant = useMemo(() => {
    if (!product) return null;
    if (!hasOptions) return product.variants[0] || null;
    return product.variants.find(v => {
      try {
        const opts: Record<string, string> = JSON.parse(v.options || "{}");
        return Object.entries(selectedOptions).every(([k, val]) => opts[k] === val);
      } catch { return false; }
    }) || product.variants[0] || null;
  }, [product, selectedOptions, hasOptions]);

  // When the selected variant changes, sync featImg + zoomIndex to that variant's image.
  // If the variant has no specific image, fall back to the first product-level image.
  useEffect(() => {
    if (!selectedVariant) return;
    const imgUrl = selectedVariant.imageUrl || product?.images[0]?.url || null;
    if (imgUrl) setFeatImg(imgUrl);
    const gi = galleryImages.findIndex(g => g.url === imgUrl);
    if (gi >= 0) setZoomIndex(gi);
  }, [selectedVariant, galleryImages, product]);

  // When a new option is picked, update selection and reset qty.
  // Image switching is handled by the useEffect watching selectedVariant.
  function pickOption(optName: string, optVal: string) {
    if (!isValueSelectable(optName, optVal)) return;
    setSelectedOptions(prev => ({ ...prev, [optName]: optVal }));
    setQty(1);
  }

  function isValueAvailable(optName: string, optVal: string): boolean {
    if (!product) return false;
    const testSel = { ...selectedOptions, [optName]: optVal };
    return product.variants.some(v => {
      try {
        const opts: Record<string, string> = JSON.parse(v.options || "{}");
        return Object.entries(testSel).every(([k, val]) => opts[k] === val) &&
               (v.inventoryItem?.available ?? 1) > 0;
      } catch { return false; }
    });
  }

  function isValueSelectable(optName: string, optVal: string): boolean {
    if (!product) return false;
    const testSel = { ...selectedOptions, [optName]: optVal };
    return product.variants.some(v => {
      try {
        const opts: Record<string, string> = JSON.parse(v.options || "{}");
        return Object.entries(testSel).every(([k, val]) => opts[k] === val);
      } catch { return false; }
    });
  }

  const addToCart = useCallback(async () => {
    if (!selectedVariant || !store) return;
    setAdding(true);
    await fetch("/api/storefront/cart", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, variantId: selectedVariant.id, quantity: qty }),
    });
    setAdding(false); setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    window.dispatchEvent(new Event("cart-updated"));
  }, [selectedVariant, store, qty]);

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-[var(--sf-brand)] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading product…</p>
      </div>
    </div>
  );

  const inStock = (selectedVariant?.inventoryItem?.available ?? 1) > 0;
  const price = selectedVariant?.price ?? 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? null;
  const discount = compareAtPrice && compareAtPrice > price ? Math.round((1 - price / compareAtPrice) * 100) : 0;
  const tags: string[] = (() => { try { return JSON.parse(product.tags || "[]"); } catch { return []; } })();
  // description may contain HTML from the rich-text editor
  const descHtml = product.bodyHtml || product.description || "";

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/store/${slug}`} className="flex items-center gap-2.5 text-xl font-bold text-gray-900">
            {store?.logo && (
              <img src={store.logo} alt={store.name} className="w-8 h-8 rounded-lg object-cover" />
            )}
            {store?.name || slug}
          </Link>
          <div className="flex items-center gap-3">
            <Link href={`/store/${slug}/search`} aria-label="Search"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </Link>
            <Link href={`/store/${slug}/account`} aria-label="My Account"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors hidden sm:flex">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </Link>
            {store?.id && <CartBadge slug={slug} storeId={store.id} />}
          </div>
        </div>
      </header>

      {/* ── Breadcrumb ── */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href={`/store/${slug}`} className="hover:text-gray-700">Home</Link>
          <span>›</span>
          <Link href={`/store/${slug}/search`} className="hover:text-gray-700">Products</Link>
          <span>›</span>
          <span className="text-gray-600 font-medium">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">

          {/* ── Images ── */}
          <div className="space-y-3">
            <div
              className="aspect-square bg-gray-50 rounded-2xl overflow-hidden relative cursor-zoom-in group"
              onClick={() => {
                if (!featImg) return;
                const i = galleryImages.findIndex(img => img.url === featImg);
                setZoomIndex(i >= 0 ? i : 0);
                setZoomOpen(true);
              }}
            >
              {discount > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {discount}% OFF
                </div>
              )}
              <div className="absolute bottom-3 right-3 z-10 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Click to zoom
              </div>
              {featImg
                ? <img src={featImg} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                : <div className="w-full h-full flex items-center justify-center text-8xl text-gray-200">📦</div>}
            </div>
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((img, i) => (
                  <button key={img.url}
                    onClick={() => { setFeatImg(img.url); setZoomIndex(i); }}
                    onDoubleClick={() => { setZoomIndex(i); setZoomOpen(true); }}
                    title={img.variantLabel ? `${img.variantLabel} · Double-click to zoom` : "Double-click to zoom"}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${featImg === img.url ? "sf-border-active shadow-md" : "border-transparent hover:border-gray-300"}`}>
                    <img src={img.url} alt={img.variantLabel || ""} className="w-full h-full object-cover" />
                    {img.variantLabel && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] font-semibold text-center py-0.5 leading-tight truncate px-0.5">
                        {img.variantLabel}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="pt-2">
            {/* Brand / Vendor — clickable link to brand search */}
            {product.vendor && (
              <Link
                href={`/store/${slug}/search?vendor=${encodeURIComponent(product.vendor)}`}
                className="inline-block text-sm font-semibold sf-text tracking-wide uppercase mb-2 hover:underline"
              >
                {product.vendor}
              </Link>
            )}
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">{product.title}</h1>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-gray-900">{formatCurrency(price, store?.currency)}</span>
                {compareAtPrice && compareAtPrice > price && (
                  <>
                    <span className="text-xl text-gray-400 line-through font-medium">{formatCurrency(compareAtPrice, store?.currency)}</span>
                    <span className="text-sm font-bold sf-chip border px-2.5 py-0.5 rounded-full">
                      Save {formatCurrency(compareAtPrice - price, store?.currency)}
                    </span>
                  </>
                )}
              </div>
              {/* GST label + breakup */}
              {product.gstRate !== undefined && product.gstRate > 0 && product.gstIncluded && (
                <div className="mt-1.5">
                  <button
                    onClick={() => setShowBreakup(b => !b)}
                    className="text-xs text-gray-500 hover:sf-text flex items-center gap-1 transition-colors"
                  >
                    <span className="sf-chip border px-2 py-0.5 rounded-full font-medium">
                      Tax Included
                    </span>
                    <span className="underline underline-offset-2">
                      {showBreakup ? "Hide Price Breakup ▲" : "View Price Breakup ▼"}
                    </span>
                  </button>
                  {showBreakup && (() => {
                    const gstRate = product.gstRate ?? 18;
                    const gstAmount = price * gstRate / (100 + gstRate);
                    const basePrice = price - gstAmount;
                    return (
                      <div className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1 w-fit">
                        <div className="flex justify-between gap-8">
                          <span>Base Price</span>
                          <span className="font-medium">{formatCurrency(Math.round(basePrice * 100) / 100, store?.currency)}</span>
                        </div>
                        <div className="flex justify-between gap-8">
                          <span>GST ({gstRate}%)</span>
                          <span className="font-medium">{formatCurrency(Math.round(gstAmount * 100) / 100, store?.currency)}</span>
                        </div>
                        <div className="flex justify-between gap-8 border-t border-gray-200 pt-1 font-semibold text-gray-800">
                          <span>Total (Incl. GST)</span>
                          <span>{formatCurrency(price, store?.currency)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Stock badge */}
            {selectedVariant && (
              <div className="mb-5">
                {!inStock ? (
                  <span className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-200">✗ Out of Stock</span>
                ) : (selectedVariant.inventoryItem?.available ?? 99) <= 5 ? (
                  <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                    ⚡ Only {selectedVariant.inventoryItem?.available} left!
                  </span>
                ) : (
                  <span className="text-xs font-semibold sf-chip border px-3 py-1 rounded-full">✓ In Stock</span>
                )}
              </div>
            )}

            {/* Option Selectors */}
            {hasOptions && (
              <div className="space-y-5 mb-6">
                {optionGroups.map(group => (
                  <div key={group.name}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <label className="text-sm font-semibold text-gray-800">{group.name}:</label>
                      <span className="text-sm text-gray-600 font-medium">{selectedOptions[group.name] || "—"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(val => {
                        const isSelected = selectedOptions[group.name] === val;
                        const isAvail = isValueAvailable(group.name, val);
                        const isSelectable = isValueSelectable(group.name, val);
                        return (
                          <button
                            key={val}
                            onClick={() => pickOption(group.name, val)}
                            disabled={!isSelectable}
                            className={[
                              "px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all",
                              isSelected
                                ? "sf-border-active sf-chip shadow-sm"
                                : isAvail
                                ? "border-gray-200 text-gray-700 hover:border-gray-400 bg-white"
                                : isSelectable
                                ? "border-gray-200 text-gray-400 bg-gray-50"
                                : "border-dashed border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed line-through",
                            ].join(" ")}
                          >
                            {val}
                            {!isAvail && isSelectable && <span className="ml-1.5 text-xs text-red-400 font-normal">(Out)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected variant summary */}
            {hasOptions && selectedVariant && (
              <div className="mb-5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600">
                Selected: <span className="font-semibold text-gray-900">{selectedVariant.title}</span>
              </div>
            )}

            {/* Qty + Add to Cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-10 h-11 text-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={qty <= 1}>−</button>
                <span className="w-10 text-center text-base font-bold text-gray-900">{qty}</span>
                <button onClick={() => setQty(q => q + 1)}
                  className="w-10 h-11 text-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={qty >= (selectedVariant?.inventoryItem?.available ?? 9999)}>+</button>
              </div>
              <button
                onClick={addToCart}
                disabled={!inStock || adding || !selectedVariant}
                className={`flex-1 h-11 rounded-xl font-bold text-sm transition-all ${
                  added ? "sf-btn scale-[0.99]"
                  : inStock ? "sf-btn shadow-sm hover:shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                {adding ? "Adding…" : added ? "✓ Added to Cart!" : inStock ? "Add to Cart" : "Out of Stock"}
              </button>
            </div>

            <Link href={`/store/${slug}/cart`}
              className="block w-full text-center border-2 border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-colors mb-8">
              View Cart →
            </Link>

            {/* Description — render rich text HTML */}
            {descHtml && (
              <div className="border-t border-gray-100 pt-6 mb-6">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Product Details</h3>
                <div
                  className="prose prose-sm max-w-none text-gray-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-semibold [&_em]:italic [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h4]:text-sm [&_p]:my-2"
                  dangerouslySetInnerHTML={{ __html: descHtml }}
                />
              </div>
            )}

            {/* Tags — clickable links */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/store/${slug}/search?tag=${encodeURIComponent(tag)}`}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-green-100 hover:text-green-700 transition-colors font-medium"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🚚", label: "Free Delivery", sub: "On orders above ₹499" },
                { icon: "↩️", label: "Easy Returns", sub: "7-day return policy" },
                { icon: "🔒", label: "Secure Payment", sub: "100% safe checkout" },
              ].map(b => (
                <div key={b.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="text-2xl mb-1">{b.icon}</div>
                  <p className="text-xs font-semibold text-gray-700">{b.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-10 border-t border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">You May Also Like</h2>
            <div className="flex gap-2">
              <button
                onClick={() => carouselRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors shadow-sm">
                ‹
              </button>
              <button
                onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                className="w-9 h-9 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors shadow-sm">
                ›
              </button>
            </div>
          </div>
          <div
            ref={carouselRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory scrollbar-none"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {relatedProducts.map(p => {
              const img = p.images?.[0]?.url;
              const inStock = p.variants?.find(v => (v.inventoryItem?.available ?? 0) > 0);
              const v = inStock ?? p.variants?.[0];
              const isOnSale = v?.compareAtPrice && v.compareAtPrice > v.price;
              const discount = isOnSale ? Math.round((1 - v!.price / v!.compareAtPrice!) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/store/${slug}/products/${p.handle}`}
                  className="shrink-0 w-40 sm:w-48 md:w-52 snap-start bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    {img
                      ? <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>}
                    {isOnSale && discount > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {discount}% OFF
                      </div>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-500 bg-white/80 px-2 py-1 rounded-full">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {p.vendor && <p className="text-xs text-gray-400 mb-0.5 truncate">{p.vendor}</p>}
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">{p.title}</h3>
                    {v && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{formatCurrency(v.price, store?.currency)}</span>
                        {isOnSale && <span className="text-xs text-gray-400 line-through">{formatCurrency(v.compareAtPrice!, store?.currency)}</span>}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reviews Section ── */}
      {product && store && (
        <ReviewsSection
          productId={product.id}
          storeId={store.id}
          slug={slug}
          loggedInCustomer={loggedInCustomer}
          customerChecked={customerChecked}
        />
      )}

      {/* ── Zoom Lightbox ── */}
      {zoomOpen && galleryImages.length > 0 && (
        <ImageZoom
          images={galleryImages}
          startIndex={zoomIndex}
          alt={product.title}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}

// ── StarPicker ────────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          className="text-2xl transition-colors" style={{ color: s <= (hover || value) ? "#FBBF24" : "#E5E7EB" }}>
          ★
        </button>
      ))}
    </div>
  );
}

// ── ReviewsSection ────────────────────────────────────────────────────────────

function ReviewsSection({
  productId, storeId, slug, loggedInCustomer, customerChecked,
}: {
  productId: string; storeId: string; slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loggedInCustomer: any; customerChecked: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [form, setForm] = useState({ name: "", email: "", rating: 0, title: "", body: "" });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    // Pre-fill name/email from logged-in customer
    if (loggedInCustomer) {
      setForm(f => ({
        ...f,
        name: f.name || `${loggedInCustomer.firstName || ""} ${loggedInCustomer.lastName || ""}`.trim(),
        email: f.email || loggedInCustomer.email || "",
      }));
    }
  }, [loggedInCustomer]);

  useEffect(() => {
    fetch(`/api/storefront/reviews?productId=${productId}&storeId=${storeId}`)
      .then(r => r.json())
      .then(d => { setReviews(d.reviews || []); setAvg(d.avg || 0); setCount(d.count || 0); })
      .catch(() => {});
  }, [productId, storeId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault(); setFormError(""); setSubmitting(true);
    if (!form.rating) { setFormError("Please select a rating"); setSubmitting(false); return; }
    if (!form.name.trim()) { setFormError("Please enter your name"); setSubmitting(false); return; }
    const res = await fetch("/api/storefront/reviews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, productId, ...form }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setFormError(d.error || "Failed to submit review"); return; }
    setSubmitted(true);
    setSubmitMsg(d.message || "Review submitted!");
    setShowForm(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-16">
      <div className="border-t border-gray-100 pt-12">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            {count > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span key={s} style={{ color: s <= Math.round(avg) ? "#FBBF24" : "#E5E7EB", fontSize: 20 }}>★</span>
                  ))}
                </div>
                <span className="font-bold text-gray-900 text-lg">{avg}</span>
                <span className="text-gray-400 text-sm">({count} review{count !== 1 ? "s" : ""})</span>
              </div>
            )}
          </div>

          {/* Write Review button — only for logged-in customers */}
          {customerChecked && !submitted && (
            loggedInCustomer ? (
              <button onClick={() => setShowForm(!showForm)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-green-700 text-sm transition-colors">
                ✍️ Write a Review
              </button>
            ) : (
              <Link
                href={`/store/${slug}/account`}
                className="border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 text-sm transition-colors"
              >
                🔐 Sign in to write a review
              </Link>
            )
          )}
        </div>

        {submitted && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-2xl text-sm font-medium">
            ✓ {submitMsg}
          </div>
        )}

        {/* Review form — only shown when logged in */}
        {showForm && loggedInCustomer && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-8">
            <h3 className="font-bold text-gray-900 text-lg mb-5">Your Review</h3>
            <form onSubmit={submitReview} className="space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{formError}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Overall Rating <span className="text-red-500">*</span></label>
                <StarPicker value={form.rating} onChange={r => setForm(f => ({ ...f, rating: r }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name <span className="text-red-500">*</span></label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Rahul Sharma"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-xs font-normal text-gray-400">(optional)</span></label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="rahul@email.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Review Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Summarise your experience"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Your Review</label>
                <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4}
                  placeholder="Tell others what you think about this product…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">⭐</div>
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map(review => (
              <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} style={{ color: s <= review.rating ? "#FBBF24" : "#E5E7EB", fontSize: 14 }}>★</span>
                        ))}
                      </div>
                      {review.verified && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified Purchase</span>
                      )}
                    </div>
                    {review.title && <p className="font-bold text-gray-900 mb-1">{review.title}</p>}
                    {review.body && <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      by <span className="font-medium text-gray-600">{review.name}</span>
                      {" · "}{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
