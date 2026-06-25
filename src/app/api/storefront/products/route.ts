import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const collectionId = searchParams.get("collectionId") || undefined;
  const search = searchParams.get("search") || undefined;
  const vendorFilter = searchParams.get("vendor") || undefined;
  const tagFilter = searchParams.get("tag") || undefined;
  const minPrice = parseFloat(searchParams.get("minPrice") || "0");
  const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const page = parseInt(searchParams.get("page") || "1");
  const limitParam = searchParams.get("limit");
  const limit = limitParam === "0" ? 0 : parseInt(limitParam || "24");

  // If limit=0, just return collections for filter UI
  if (limit === 0) {
    const collections = await prisma.collection.findMany({
      where: { storeId, status: "ACTIVE" },
      select: { id: true, title: true, handle: true },
      orderBy: { title: "asc" },
    });
    return NextResponse.json({ products: [], total: 0, page: 1, pages: 0, collections });
  }

  const where: Record<string, unknown> = { storeId, status: "ACTIVE" };
  if (search) where.OR = [
    { title: { contains: search } },
    { vendor: { contains: search } },
    { description: { contains: search } },
    { tags: { contains: search } },
    { material: { contains: search } },
  ];
  if (collectionId) where.collections = { some: { collectionId } };
  if (vendorFilter) where.vendor = { contains: vendorFilter };
  if (tagFilter) where.tags = { contains: tagFilter };
  if (minPrice > 0 || maxPrice < 999999) {
    where.variants = { some: { price: { gte: minPrice, lte: maxPrice }, status: "ACTIVE" } };
  }

  const orderByMap: Record<string, unknown> = {
    createdAt: { createdAt: "desc" },
    price_asc: { createdAt: "asc" }, // will re-sort client-side; server just returns all
    price_desc: { createdAt: "desc" },
    title_asc: { title: "asc" },
    newest: { createdAt: "desc" },
  };

  const [products, total, collections] = await Promise.all([
    prisma.product.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: {
        images: { where: { isFeatured: true }, take: 1 },
        variants: { where: { status: "ACTIVE" }, include: { inventoryItem: { select: { available: true } } }, orderBy: { price: "asc" } },
      },
      orderBy: (orderByMap[sortBy] || { createdAt: "desc" }) as Record<string, string>,
    }),
    prisma.product.count({ where }),
    prisma.collection.findMany({
      where: { storeId, status: "ACTIVE" },
      select: { id: true, title: true, handle: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return NextResponse.json({ products, total, page, pages: Math.ceil(total / limit), collections });
}
