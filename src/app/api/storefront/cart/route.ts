import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

async function getOrCreateCart(storeId: string, sessionId: string) {
  let cart = await prisma.cart.findFirst({
    where: { storeId, sessionId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          variant: {
            include: {
              product: { select: { id: true, title: true, handle: true, storeId: true, gstRate: true, gstIncluded: true, images: { where: { isFeatured: true }, take: 1 } } },
              inventoryItem: { select: { available: true } },
            },
          },
        },
      },
    },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { storeId, sessionId },
      include: {
        items: {
          where: { savedForLater: false },
          include: { variant: { include: { product: { select: { id: true, title: true, handle: true, storeId: true, gstRate: true, gstIncluded: true, images: { where: { isFeatured: true }, take: 1 } } }, inventoryItem: { select: { available: true } } } } },
        },
      },
    });
  }
  return cart;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(`cart-${storeId}`)?.value || uuidv4();
  const res = NextResponse.json({ cart: await getOrCreateCart(storeId, sessionId) });
  res.cookies.set(`cart-${storeId}`, sessionId, { maxAge: 30 * 86400, httpOnly: true, sameSite: "lax" });
  return res;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, variantId, quantity = 1, action } = body;
  if (!storeId || !variantId) return NextResponse.json({ error: "storeId and variantId required" }, { status: 400 });

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(`cart-${storeId}`)?.value || uuidv4();

  const cart = await getOrCreateCart(storeId, sessionId);

  // Validate variant
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, product: { storeId }, status: "ACTIVE" },
    include: { inventoryItem: true, product: { select: { title: true } } },
  });
  if (!variant) return NextResponse.json({ error: "Product not available" }, { status: 400 });

  if (action === "remove") {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
  } else if (action === "update") {
    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
    } else {
      const inv = variant.inventoryItem;
      if (inv?.trackInventory && inv.available < quantity && !inv.allowBackorder)
        return NextResponse.json({ error: `Only ${inv.available} in stock` }, { status: 400 });
      await prisma.cartItem.upsert({
        where: { id: (await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId } }))?.id || "" },
        update: { quantity },
        create: { cartId: cart.id, variantId, quantity },
      });
    }
  } else {
    // add
    const inv = variant.inventoryItem;
    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, variantId } });
    const newQty = (existing?.quantity || 0) + quantity;
    if (inv?.trackInventory && inv.available < newQty && !inv.allowBackorder)
      return NextResponse.json({ error: `Only ${inv.available} in stock` }, { status: 400 });
    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
    }
  }

  const updated = await getOrCreateCart(storeId, sessionId);
  const res = NextResponse.json({ cart: updated });
  res.cookies.set(`cart-${storeId}`, sessionId, { maxAge: 30 * 86400, httpOnly: true, sameSite: "lax" });
  return res;
}
