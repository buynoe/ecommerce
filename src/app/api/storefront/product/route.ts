import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeSlug = searchParams.get("slug");
  const handle = searchParams.get("handle");

  if (!storeSlug || !handle) return NextResponse.json({ error: "slug and handle required" }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const product = await prisma.product.findUnique({
    where: { storeId_handle: { storeId: store.id, handle } },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: {
        where: { status: "ACTIVE" },
        include: { inventoryItem: { select: { available: true, trackInventory: true, allowBackorder: true } } },
        orderBy: { position: "asc" },
      },
      taxProfile: true,
      collections: { select: { collectionId: true }, take: 3 },
    },
  });

  if (!product || product.status !== "ACTIVE") return NextResponse.json({ error: "Product not found" }, { status: 404 });

  return NextResponse.json({
    product,
    store: { id: store.id, name: store.name, currency: store.currency, logo: store.logo ?? null },
  });
}
