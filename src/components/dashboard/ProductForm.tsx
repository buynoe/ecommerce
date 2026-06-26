"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import RichTextEditor from "@/components/ui/RichTextEditor";
import GalleryWidget from "@/components/ui/GalleryWidget";
import Link from "next/link";
import Image from "next/image";
import { Camera, Shuffle, Package, Layers, Tag, Image as ImageIcon, Lightbulb } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductOption { name: string; values: string[] }

interface VariantRow {
  id?: string;
  title: string;           // "S / Red"
  optionValues: string[];  // ["S", "Red"]
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stock: string;
  imageIds: string[];      // asset IDs picked from gallery for this variant
  imageUrls: string[];     // resolved URLs for display
}

interface ProductImage {
  id?: string;
  url: string;
  alt: string;
  isFeatured?: boolean;
}

interface Collection { id: string; title: string }
interface Category { id: string; name: string }
interface Asset { id: string; url: string; thumbnailUrl?: string; filename: string; size: number; alt?: string }

interface Props {
  initialData?: {
    id?: string; title?: string; description?: string; vendor?: string;
    productType?: string; material?: string; gstRate?: number; gstIncluded?: boolean; status?: string; tags?: string;
    options?: ProductOption[];
    variants?: VariantRow[];
    images?: ProductImage[];
    collectionIds?: string[];
    categoryIds?: string[];
  };
  mode: "create" | "edit";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cartesian(arrays: string[][]): string[][] {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restCombos = cartesian(rest);
  return first.flatMap(v => restCombos.map(combo => [v, ...combo]));
}

function combosToVariants(options: ProductOption[], existing: VariantRow[]): VariantRow[] {
  const nonEmpty = options.filter(o => o.name && o.values.filter(Boolean).length);
  if (!nonEmpty.length) return existing.length ? existing : [blankVariant("Default", [])];
  const combos = cartesian(nonEmpty.map(o => o.values.filter(Boolean)));
  return combos.map(combo => {
    const title = combo.join(" / ");
    const old = existing.find(v => v.title === title);
    return old ?? blankVariant(title, combo);
  });
}

function blankVariant(title: string, optionValues: string[]): VariantRow {
  return { title, optionValues, sku: "", price: "", compareAtPrice: "", costPrice: "", stock: "10", imageIds: [], imageUrls: [] };
}

const COMMON_OPTIONS = ["Size", "Color", "Material", "Style", "Weight", "Flavour", "Volume", "Pack Size"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductForm({ initialData, mode }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(initialData?.collectionIds || []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categoryIds || []);

  const [form, setForm] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    vendor: initialData?.vendor || "",
    productType: initialData?.productType || "",
    material: initialData?.material || "",
    gstRate: initialData?.gstRate ?? 18,
    gstIncluded: initialData?.gstIncluded ?? true,
    status: initialData?.status || "ACTIVE",
    tags: initialData?.tags || "",
  });

  // Product-level images (gallery)
  const [productImages, setProductImages] = useState<ProductImage[]>(initialData?.images || []);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [variantGalleryFor, setVariantGalleryFor] = useState<number | null>(null); // variant index

  // Options
  const [options, setOptions] = useState<ProductOption[]>(
    initialData?.options?.length ? initialData.options : []
  );

  // Variants
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants?.length ? initialData.variants : [blankVariant("Default", [])]
  );

  // Sync variants when options change
  const syncVariants = useCallback((newOptions: ProductOption[]) => {
    setVariants(prev => combosToVariants(newOptions, prev));
  }, []);

  useEffect(() => {
    fetch("/api/collections").then(r => r.json()).then(d => setCollections(d.collections || []));
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  // ── Option management ─────────────────────────────────────────────────────

  function addOption() {
    const newOpts = [...options, { name: "", values: [""] }];
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function removeOption(i: number) {
    const newOpts = options.filter((_, idx) => idx !== i);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function updateOptionName(i: number, name: string) {
    const newOpts = options.map((o, idx) => idx === i ? { ...o, name } : o);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function updateOptionValues(i: number, raw: string) {
    const values = raw.split(",").map(v => v.trim());
    const newOpts = options.map((o, idx) => idx === i ? { ...o, values } : o);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function addOptionValue(i: number) {
    const newOpts = options.map((o, idx) => idx === i ? { ...o, values: [...o.values, ""] } : o);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function removeOptionValue(oi: number, vi: number) {
    const newOpts = options.map((o, idx) => idx === oi ? { ...o, values: o.values.filter((_, j) => j !== vi) } : o);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  function updateSingleOptionValue(oi: number, vi: number, val: string) {
    const newOpts = options.map((o, idx) => idx === oi ? { ...o, values: o.values.map((v, j) => j === vi ? val : v) } : o);
    setOptions(newOpts);
    syncVariants(newOpts);
  }

  // ── Variant management ────────────────────────────────────────────────────

  function updateVariant(i: number, k: keyof VariantRow, val: string) {
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...v, [k]: val } : v));
  }

  function setVariantImages(i: number, assets: Asset[]) {
    setVariants(prev => prev.map((v, idx) => idx === i
      ? { ...v, imageIds: assets.map(a => a.id), imageUrls: assets.map(a => a.thumbnailUrl || a.url) }
      : v));
  }

  // ── Product-level images ──────────────────────────────────────────────────

  function onGallerySelect(assets: Asset[]) {
    if (variantGalleryFor !== null) {
      setVariantImages(variantGalleryFor, assets);
      setVariantGalleryFor(null);
    } else {
      // product images
      const newImgs = assets.map(a => ({ id: a.id, url: a.url, alt: a.alt || a.filename, isFeatured: false }));
      setProductImages(prev => {
        const merged = [...prev];
        for (const img of newImgs) {
          if (!merged.find(x => x.id === img.id)) merged.push(img);
        }
        if (merged.length > 0) merged[0].isFeatured = true;
        return merged;
      });
    }
  }

  function removeProductImage(i: number) {
    setProductImages(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length) next[0].isFeatured = true;
      return next;
    });
  }

  function makeCover(i: number) {
    setProductImages(prev => prev.map((img, idx) => ({ ...img, isFeatured: idx === i })));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        options,
        variants: variants.map((v, i) => ({
          ...(v.id ? { id: v.id } : {}),
          title: v.title,
          optionValues: v.optionValues,   // needed by API to build options JSON per variant
          sku: v.sku,
          price: parseFloat(v.price) || 0,
          compareAtPrice: v.compareAtPrice ? parseFloat(v.compareAtPrice) : undefined,
          costPrice: v.costPrice ? parseFloat(v.costPrice) : undefined,
          stock: parseInt(v.stock) || 0,
          position: i,
          imageUrl: v.imageUrls[0] || undefined,
        })),
        images: productImages.map((img, i) => ({
          id: img.id, url: img.url, alt: img.alt,
          position: i, isFeatured: i === 0,
        })),
        collectionIds: selectedCollections,
        categoryIds: selectedCategories,
      };

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/products/${initialData!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/dashboard/products");
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  const hasOptions = options.length > 0;

  return (
    <>
      <GalleryWidget
        open={galleryOpen}
        onClose={() => { setGalleryOpen(false); setVariantGalleryFor(null); }}
        onSelect={onGallerySelect}
        multiple={variantGalleryFor === null ? true : true}
        selected={variantGalleryFor !== null ? variants[variantGalleryFor]?.imageIds : productImages.map(i => i.id!).filter(Boolean)}
      />

      <div className="max-w-5xl">
        <PageHeader
          title={mode === "create" ? "Add Product" : "Edit Product"}
          action={<Link href="/dashboard/products" className="border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">← Back</Link>}
        />
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">Product Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                <input required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Premium Cotton Shirt" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichTextEditor value={form.description} onChange={html => setForm(f => ({ ...f, description: html }))}
                  placeholder="Write a detailed description with bullet points, features, care instructions…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand / Vendor</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} placeholder="Nike, Nestlé…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category / Type</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={form.productType} onChange={e => setForm(f => ({ ...f, productType: e.target.value }))} placeholder="Clothing, Grocery, Electronics…" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags <span className="text-xs text-gray-400">(comma separated)</span></label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="sale, summer, organic" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material <span className="text-xs text-gray-400">(optional)</span></label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} placeholder="Cotton, Stainless Steel, Leather…" />
                </div>
              </div>

              {/* GST Configuration */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-3">GST Configuration</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">GST Rate</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                      value={form.gstRate}
                      onChange={e => setForm(f => ({ ...f, gstRate: parseFloat(e.target.value) }))}>
                      <option value={0}>0% — Exempt</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.gstIncluded}
                        onChange={e => setForm(f => ({ ...f, gstIncluded: e.target.checked }))}
                        className="w-4 h-4 rounded text-green-600 border-gray-300" />
                      <span className="text-sm text-gray-700">GST included in price</span>
                    </label>
                    <p className="text-xs text-gray-400 mt-1 ml-6">
                      {form.gstIncluded ? "Price shown to customers already includes GST" : "GST will be added to price at checkout"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Images */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Product Images</h2>
                  <p className="text-xs text-gray-400 mt-0.5">First image is the cover photo · Hover to change cover or remove</p>
                </div>
                <button type="button" onClick={() => { setVariantGalleryFor(null); setGalleryOpen(true); }}
                  className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-green-400 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Open Gallery
                </button>
              </div>

              {productImages.length === 0 ? (
                <button type="button" onClick={() => { setVariantGalleryFor(null); setGalleryOpen(true); }}
                  className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300 hover:border-green-400 hover:text-green-400 transition-colors">
                  <Camera className="w-8 h-8" />
                  <span className="text-sm mt-2 font-medium">Click to add images from gallery</span>
                </button>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {productImages.map((img, i) => (
                    <div key={i} className={`relative group rounded-xl overflow-hidden border-2 ${img.isFeatured ? "border-green-500" : "border-transparent"}`}>
                      <div className="aspect-square bg-gray-50">
                        <Image src={img.url} alt={img.alt} width={140} height={140} className="w-full h-full object-cover" unoptimized />
                      </div>
                      {img.isFeatured && (
                        <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-xs text-center py-0.5 font-semibold">
                          Cover Photo
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                        {!img.isFeatured && (
                          <button type="button" onClick={() => makeCover(i)} className="w-full bg-green-600 text-white text-xs py-0.5 rounded font-medium hover:bg-green-700">
                            Set Cover
                          </button>
                        )}
                        <button type="button" onClick={() => removeProductImage(i)} className="w-full bg-red-600 text-white text-xs py-0.5 rounded font-medium hover:bg-red-700">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => { setVariantGalleryFor(null); setGalleryOpen(true); }}
                    className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:border-green-400 hover:text-green-400 transition-colors text-3xl">
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Options & Variants */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-gray-900">Options & Variants</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Define options like Size, Color, Material — variants are auto-generated</p>
                </div>
                {!hasOptions && (
                  <button type="button" onClick={addOption} className="text-sm text-green-600 font-semibold hover:underline">
                    + Add Options
                  </button>
                )}
              </div>

              {/* Option rows */}
              {options.map((opt, oi) => (
                <div key={oi} className="mt-4 border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Option Name</label>
                      <div className="flex gap-2">
                        <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none bg-white"
                          value={COMMON_OPTIONS.includes(opt.name) ? opt.name : "custom"}
                          onChange={e => e.target.value !== "custom" && updateOptionName(oi, e.target.value)}>
                          {COMMON_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                          <option value="custom">Custom…</option>
                        </select>
                        <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                          value={opt.name} onChange={e => updateOptionName(oi, e.target.value)} placeholder="e.g. Size" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeOption(oi)} className="text-red-400 hover:text-red-600 text-lg leading-none mt-4">×</button>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">
                      Values <span className="text-gray-400 font-normal">(press Enter or comma to add)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {opt.values.filter(Boolean).map((val, vi) => (
                        <span key={vi} className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-3 py-0.5 text-sm font-medium text-gray-700">
                          <input className="bg-transparent outline-none w-auto font-medium text-sm"
                            style={{ width: `${Math.max(val.length, 3)}ch` }}
                            value={val}
                            onChange={e => updateSingleOptionValue(oi, vi, e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOptionValue(oi); } }}
                          />
                          <button type="button" onClick={() => removeOptionValue(oi, vi)} className="text-gray-400 hover:text-red-500 leading-none ml-0.5">×</button>
                        </span>
                      ))}
                      <button type="button" onClick={() => addOptionValue(oi)}
                        className="border border-dashed border-gray-300 rounded-full px-3 py-0.5 text-sm text-gray-400 hover:border-green-400 hover:text-green-600">
                        + Add value
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Or type all at once, comma-separated:&nbsp;
                      <input className="border-b border-gray-300 text-xs focus:outline-none focus:border-green-500 px-1"
                        placeholder="S, M, L, XL"
                        onBlur={e => { if (e.target.value) { updateOptionValues(oi, e.target.value); e.target.value = ""; } }}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const t = e.currentTarget; if (t.value) { updateOptionValues(oi, t.value); t.value = ""; } } }}
                      />
                    </p>
                  </div>
                </div>
              ))}

              {hasOptions && (
                <button type="button" onClick={addOption} className="mt-3 text-sm text-green-600 font-medium hover:underline">
                  + Add another option
                </button>
              )}

              {/* ── Variant table ── */}
              {(hasOptions ? variants.length > 0 : true) && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {hasOptions ? `${variants.length} variant${variants.length !== 1 ? "s" : ""} generated` : "Pricing & Inventory"}
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {hasOptions && <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Variant</th>}
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Image</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">SKU</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Price (₹) *</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">MRP</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Cost</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {variants.map((v, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {hasOptions && (
                              <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{v.title}</td>
                            )}
                            {/* Variant image picker */}
                            <td className="px-3 py-2">
                              <button type="button"
                                onClick={() => { setVariantGalleryFor(i); setGalleryOpen(true); }}
                                className="w-10 h-10 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-400 flex items-center justify-center overflow-hidden transition-colors"
                                title="Pick image for this variant"
                              >
                                {v.imageUrls[0]
                                  ? <Image src={v.imageUrls[0]} alt="" width={40} height={40} className="w-full h-full object-cover rounded" unoptimized />
                                  : <Camera className="w-4 h-4 text-gray-300" />}
                              </button>
                            </td>
                            <td className="px-2 py-1.5">
                              <input className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                value={v.sku} onChange={e => updateVariant(i, "sku", e.target.value)} placeholder="SKU-001" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input required type="number" min="0" step="0.01"
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                value={v.price} onChange={e => updateVariant(i, "price", e.target.value)} placeholder="999" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0" step="0.01"
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                value={v.compareAtPrice} onChange={e => updateVariant(i, "compareAtPrice", e.target.value)} placeholder="1299" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0" step="0.01"
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-24 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                value={v.costPrice} onChange={e => updateVariant(i, "costPrice", e.target.value)} placeholder="500" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" min="0"
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-20 focus:ring-1 focus:ring-green-500 focus:outline-none"
                                value={v.stock} onChange={e => updateVariant(i, "stock", e.target.value)} placeholder="10" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bulk fill tip */}
                  {variants.length > 1 && (
                    <p className="text-xs text-gray-400 mt-2">
                      <Lightbulb className="w-3.5 h-3.5 inline mr-1" /> Tip: Set price on the first row, then copy to others as needed. Each variant can have its own image.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Status</h2>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Active — visible in store</option>
                <option value="DRAFT">Draft — hidden from store</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Collections */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Collections</h2>
              {collections.length === 0 ? (
                <p className="text-xs text-gray-400">No collections yet. <Link href="/dashboard/collections" className="text-green-600 hover:underline">Create one →</Link></p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {collections.map(col => (
                    <label key={col.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={selectedCollections.includes(col.id)}
                        onChange={() => setSelectedCollections(s => s.includes(col.id) ? s.filter(x => x !== col.id) : [...s, col.id])} />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{col.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Categories (multi-select) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Categories</h2>
                {selectedCategories.length > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{selectedCategories.length} selected</span>
                )}
              </div>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400">No categories yet. <Link href="/dashboard/categories" className="text-green-600 hover:underline">Create one →</Link></p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => setSelectedCategories(s => s.includes(cat.id) ? s.filter(x => x !== cat.id) : [...s, cat.id])} />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-800 space-y-1">
              <p className="font-semibold">Summary</p>
              <p className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> {productImages.length} product image{productImages.length !== 1 ? "s" : ""}</p>
              <p className="flex items-center gap-1.5"><Shuffle className="w-3.5 h-3.5" /> {options.length} option group{options.length !== 1 ? "s" : ""}</p>
              <p className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {variants.length} variant{variants.length !== 1 ? "s" : ""}</p>
              <p className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> {selectedCollections.length} collection{selectedCollections.length !== 1 ? "s" : ""}</p>
              <p className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {selectedCategories.length} categor{selectedCategories.length !== 1 ? "ies" : "y"}</p>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? "Saving…" : mode === "create" ? "Save Product" : "Update Product"}
            </button>

            {mode === "edit" && (
              <Link href="/dashboard/products" className="block w-full text-center border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium hover:bg-gray-50">
                Cancel
              </Link>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
