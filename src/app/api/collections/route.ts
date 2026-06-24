import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { syncAutomatedCollection } from "@/lib/services/product.service";

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const collections = await prisma.collection.findMany({
    where: { storeId: m.store!.id },
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  let handle = slugify(body.title);
  const existing = await prisma.collection.findUnique({ where: { storeId_handle: { storeId: m.store!.id, handle } } });
  if (existing) handle = `${handle}-${Date.now()}`;

  const collection = await prisma.collection.create({
    data: {
      storeId: m.store!.id, title: body.title, handle,
      description: body.description, imageUrl: body.imageUrl,
      type: body.type || "MANUAL",
      rules: JSON.stringify(body.rules || []),
      status: body.status || "ACTIVE",
    },
  });

  if (collection.type === "AUTOMATED") await syncAutomatedCollection(collection.id);

  // Add manual products
  if (body.type === "MANUAL" && body.productIds?.length) {
    await prisma.collectionProduct.createMany({
      data: body.productIds.map((pid: string, i: number) => ({ collectionId: collection.id, productId: pid, position: i })),
    });
  }

  return NextResponse.json({ collection }, { status: 201 });
}
