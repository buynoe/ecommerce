import { prisma } from "@/lib/prisma";
import { generateHandle, parseJSON } from "@/lib/utils";

export async function createProduct(storeId: string, data: {
  title: string; description?: string; bodyHtml?: string; vendor?: string;
  productType?: string; material?: string; tags?: string[]; status?: string; taxProfileId?: string;
  variants: Array<{ title?: string; sku?: string; price: number; compareAtPrice?: number;
    costPrice?: number; weight?: number; options?: Record<string, string>; stock?: number; imageUrl?: string | null }>;
  images?: Array<{ url: string; alt?: string; position?: number; isFeatured?: boolean }>;
}) {
  let handle = generateHandle(data.title);
  const existing = await prisma.product.findUnique({ where: { storeId_handle: { storeId, handle } } });
  if (existing) handle = `${handle}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      storeId, title: data.title, handle,
      description: data.description, bodyHtml: data.bodyHtml,
      vendor: data.vendor, productType: data.productType, material: data.material,
      tags: JSON.stringify(data.tags || []),
      status: data.status || "ACTIVE",
      taxProfileId: data.taxProfileId,
      images: data.images ? { create: data.images } : undefined,
      variants: {
        create: data.variants.map((v, i) => ({
          title: v.title || "Default", sku: v.sku, price: v.price,
          compareAtPrice: v.compareAtPrice, costPrice: v.costPrice,
          weight: v.weight, options: JSON.stringify(v.options || {}), position: i,
          imageUrl: v.imageUrl || null,
          inventoryItem: { create: { available: v.stock || 0 } },
        })),
      },
    },
    include: { variants: { include: { inventoryItem: true } }, images: true },
  });

  return product;
}

export async function getStoreProducts(storeId: string, filters?: {
  status?: string; search?: string; collectionId?: string; page?: number; limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { storeId };
  if (filters?.status) where.status = filters.status;
  if (filters?.search) where.title = { contains: filters.search };
  if (filters?.collectionId) {
    where.collections = { some: { collectionId: filters.collectionId } };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, skip, take: limit,
      include: { images: { where: { isFeatured: true }, take: 1 }, variants: { include: { inventoryItem: true }, take: 1 }, _count: { select: { orderItems: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function syncAutomatedCollection(collectionId: string) {
  const collection = await prisma.collection.findUnique({ where: { id: collectionId }, include: { store: true } });
  if (!collection || collection.type !== "AUTOMATED") return;

  const rules: Array<{ field: string; operator: string; value: string }> = parseJSON(collection.rules, []);
  const storeId = collection.storeId;

  let products = await prisma.product.findMany({ where: { storeId, status: "ACTIVE" }, include: { variants: { take: 1 } } });

  for (const rule of rules) {
    products = products.filter(p => {
      if (rule.field === "price") {
        const price = p.variants[0]?.price || 0;
        if (rule.operator === "greater_than") return price > parseFloat(rule.value);
        if (rule.operator === "less_than") return price < parseFloat(rule.value);
        if (rule.operator === "equals") return price === parseFloat(rule.value);
      }
      if (rule.field === "vendor") {
        if (rule.operator === "equals") return p.vendor === rule.value;
        if (rule.operator === "contains") return p.vendor?.includes(rule.value) || false;
      }
      if (rule.field === "product_type") {
        if (rule.operator === "equals") return p.productType === rule.value;
      }
      return true;
    });
  }

  await prisma.collectionProduct.deleteMany({ where: { collectionId } });
  if (products.length > 0) {
    await prisma.collectionProduct.createMany({
      data: products.map((p, i) => ({ collectionId, productId: p.id, position: i })),
    });
  }
}
