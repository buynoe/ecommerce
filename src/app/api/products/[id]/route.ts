import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  // Fetch product without nested categories (LibSQL adapter can't handle nested select+include combos)
  const product = await prisma.product.findFirst({
    where: { id, storeId: m.store!.id },
    include: {
      variants: {
        include: { inventoryItem: true },
        orderBy: { position: "asc" as const },
      },
      images: { orderBy: { position: "asc" as const } },
      taxProfile: true,
      collections: { include: { collection: { select: { id: true, title: true } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch categories separately
  const productCategories = await prisma.productCategory.findMany({
    where: { productId: id },
    include: { category: true },
  });

  return NextResponse.json({ product: { ...product, categories: productCategories } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  await prisma.product.update({
    where: { id, storeId: m.store!.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status && { status: body.status }),
      ...(body.vendor !== undefined && { vendor: body.vendor }),
      ...(body.productType !== undefined && { productType: body.productType }),
      ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
    },
  });

  // Replace images
  if (body.images !== undefined) {
    await prisma.productImage.deleteMany({ where: { productId: id } });
    if (body.images.length) {
      await prisma.productImage.createMany({
        data: body.images.map((img: { url: string; alt: string; position: number; isFeatured: boolean }) => ({
          productId: id, url: img.url, alt: img.alt, position: img.position, isFeatured: img.isFeatured,
        })),
      });
    }
  }

  // Upsert variants
  if (body.variants?.length) {
    // Build options object per variant from the options array + optionValues
    const optionNames: string[] = (body.options || []).map((o: { name: string }) => o.name);
    for (const v of body.variants) {
      // Reconstruct options map: { "Size": "S", "Color": "Red" }
      const optionsObj: Record<string, string> = {};
      if (optionNames.length && v.optionValues?.length) {
        optionNames.forEach((name: string, idx: number) => {
          if (v.optionValues[idx]) optionsObj[name] = v.optionValues[idx];
        });
      }
      if (v.id) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: {
            title: v.title, sku: v.sku || null,
            price: v.price, compareAtPrice: v.compareAtPrice || null,
            costPrice: v.costPrice || null,
            options: JSON.stringify(optionsObj),
            imageUrl: v.imageUrl || null,
          },
        });
        if (v.stock !== undefined) {
          await prisma.inventoryItem.updateMany({
            where: { variantId: v.id },
            data: { available: Number(v.stock) },
          });
        }
      } else {
        // New variant (added during edit)
        const newVariant = await prisma.productVariant.create({
          data: {
            productId: id, title: v.title, sku: v.sku || null,
            price: v.price, compareAtPrice: v.compareAtPrice || null,
            costPrice: v.costPrice || null,
            options: JSON.stringify(optionsObj),
            position: v.position || 0,
            imageUrl: v.imageUrl || null,
          },
        });
        await prisma.inventoryItem.create({
          data: { variantId: newVariant.id, available: Number(v.stock) || 0 },
        });
      }
    }
  }

  // Replace collections
  if (body.collectionIds !== undefined) {
    await prisma.collectionProduct.deleteMany({ where: { productId: id } });
    if ((body.collectionIds as string[]).length) {
      await prisma.collectionProduct.createMany({
        data: (body.collectionIds as string[]).map((cid: string, i: number) => ({
          collectionId: cid, productId: id, position: i,
        })),
      });
    }
  }

  // Replace categories
  if (body.categoryIds !== undefined) {
    await prisma.productCategory.deleteMany({ where: { productId: id } });
    for (const cid of body.categoryIds as string[]) {
      await prisma.productCategory.create({ data: { categoryId: cid, productId: id } });
    }
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: { include: { inventoryItem: true } },
      images: true,
      collections: { include: { collection: { select: { id: true, title: true } } } },
    },
  });
  // Fetch categories separately (LibSQL adapter limitation)
  const updatedCategories = await prisma.productCategory.findMany({
    where: { productId: id },
    include: { category: true },
  });
  return NextResponse.json({ product: { ...product, categories: updatedCategories } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.product.delete({ where: { id, storeId: m.store!.id } });
  return NextResponse.json({ success: true });
}
