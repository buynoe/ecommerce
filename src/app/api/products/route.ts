import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { createProduct, getStoreProducts } from "@/lib/services/product.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const result = await getStoreProducts(m.store!.id, {
    status: searchParams.get("status") || undefined,
    search: searchParams.get("search") || undefined,
    collectionId: searchParams.get("collectionId") || undefined,
    page: parseInt(searchParams.get("page") || "1"),
    limit: parseInt(searchParams.get("limit") || "20"),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.title || !body.variants?.length) return NextResponse.json({ error: "Title and variants required" }, { status: 400 });

  // Convert optionValues array + options name list → { "Size": "S", "Color": "Red" } map for each variant
  const optionNames: string[] = (body.options || []).map((o: { name: string }) => o.name);
  const variantsWithOptions = (body.variants as Array<{ optionValues?: string[]; [k: string]: unknown }>).map(v => {
    const optionsObj: Record<string, string> = {};
    if (optionNames.length && v.optionValues?.length) {
      optionNames.forEach((name, idx) => { if (v.optionValues![idx]) optionsObj[name] = v.optionValues![idx]; });
    }
    return { ...v, options: optionsObj };
  });

  const product = await createProduct(m.store!.id, { ...body, variants: variantsWithOptions });

  // Assign to collections
  if (body.collectionIds?.length) {
    await prisma.collectionProduct.createMany({
      data: (body.collectionIds as string[]).map((cid: string, i: number) => ({
        collectionId: cid, productId: product.id, position: i,
      })),
    });
  }

  // Assign to categories
  if (body.categoryIds?.length) {
    for (const cid of body.categoryIds as string[]) {
      const exists = await prisma.productCategory.findUnique({
        where: { productId_categoryId: { productId: product.id, categoryId: cid } },
      });
      if (!exists) {
        await prisma.productCategory.create({ data: { categoryId: cid, productId: product.id } });
      }
    }
  }

  return NextResponse.json({ product }, { status: 201 });
}
