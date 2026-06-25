"use client";
import { use, useEffect, useState } from "react";
import ProductForm from "@/components/dashboard/ProductForm";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.product) setProduct(d.product);
        else setError(d.error || "Product not found");
        setLoading(false);
      })
      .catch(() => { setError("Failed to load product"); setLoading(false); });
  }, [id]);

  if (loading) return <div className="p-12 text-center text-gray-400">Loading product…</div>;
  if (error) return <div className="p-12 text-center text-red-500">{error}</div>;

  // Reconstruct option groups from variant options JSON
  // Each variant has options like {"Size":"S","Color":"Red"} stored as JSON string
  type RawVariant = {
    id: string; title: string; sku?: string; price: number;
    compareAtPrice?: number; costPrice?: number; options?: string;
    imageUrl?: string | null;
    inventoryItem?: { available: number };
  };

  const rawVariants: RawVariant[] = product.variants || [];

  // Determine max option slots from variant titles (e.g. "S / Red" → 2 slots)
  const maxSlots = rawVariants.reduce((m, v) => {
    if (v.title === "Default") return m;
    const parts = v.title.split(" / ").map(s => s.trim()).filter(Boolean);
    return Math.max(m, parts.length);
  }, 0);

  const optionMap: Record<string, Set<string>> = {};
  for (const v of rawVariants) {
    try {
      const opts: Record<string, string> = JSON.parse(v.options || "{}");
      if (Object.keys(opts).length > 0) {
        // options JSON is populated — use it
        for (const [k, val] of Object.entries(opts)) {
          if (!optionMap[k]) optionMap[k] = new Set();
          if (val) optionMap[k].add(val);
        }
      } else if (maxSlots > 0 && v.title !== "Default") {
        // options JSON is empty — reconstruct from title parts using generic slot names
        const parts = v.title.split(" / ").map(s => s.trim());
        parts.forEach((part, i) => {
          const key = `Option ${i + 1}`;
          if (!optionMap[key]) optionMap[key] = new Set();
          if (part) optionMap[key].add(part);
        });
      }
    } catch { /* ignore */ }
  }
  const reconstructedOptions = Object.entries(optionMap).map(([name, vals]) => ({
    name, values: Array.from(vals),
  }));

  const initialData = {
    id: product.id,
    title: product.title,
    description: product.description || "",
    vendor: product.vendor || "",
    productType: product.productType || "",
    material: product.material || "",
    gstRate: product.gstRate ?? 18,
    gstIncluded: product.gstIncluded ?? true,
    status: product.status,
    tags: (() => { try { return JSON.parse(product.tags || "[]").join(", "); } catch { return ""; } })(),
    options: reconstructedOptions,
    variants: rawVariants.map((v) => {
      let optionValues: string[] = [];
      try {
        const opts: Record<string, string> = JSON.parse(v.options || "{}");
        if (Object.keys(opts).length > 0) {
          optionValues = Object.values(opts).filter(Boolean);
        } else if (v.title !== "Default") {
          // Fall back to splitting the title
          optionValues = v.title.split(" / ").map(s => s.trim()).filter(Boolean);
        }
      } catch { /* ignore */ }
      return {
        id: v.id,
        title: v.title,
        optionValues,
        sku: v.sku || "",
        price: String(v.price),
        compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : "",
        costPrice: v.costPrice ? String(v.costPrice) : "",
        stock: String(v.inventoryItem?.available ?? 0),
        imageIds: [],
        imageUrls: v.imageUrl ? [v.imageUrl] : [],
      };
    }),
    images: product.images?.map((img: { id: string; url: string; alt?: string }) => ({
      id: img.id, url: img.url, alt: img.alt || "",
    })),
    collectionIds: product.collections?.map((c: { collectionId: string }) => c.collectionId) || [],
    categoryIds: product.categories?.map((c: { categoryId: string }) => c.categoryId) || [],
  };

  return <ProductForm mode="edit" initialData={initialData} />;
}
