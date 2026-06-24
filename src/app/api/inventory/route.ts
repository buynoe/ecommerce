import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustInventory, getLowStockItems } from "@/lib/services/inventory.service";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);

  if (searchParams.get("lowStock") === "true") {
    const items = await getLowStockItems(m.store!.id);
    return NextResponse.json({ items });
  }

  const variants = await prisma.productVariant.findMany({
    where: { product: { storeId: m.store!.id } },
    include: {
      product: { select: { title: true, images: { where: { isFeatured: true }, take: 1 } } },
      inventoryItem: { include: { logs: { orderBy: { createdAt: "desc" }, take: 5 } } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ variants });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { variantId, quantity, action, reason } = await req.json();
  if (!variantId || quantity === undefined || !action) return NextResponse.json({ error: "variantId, quantity, action required" }, { status: 400 });

  const item = await adjustInventory(variantId, quantity, action, reason);
  return NextResponse.json({ item });
}
