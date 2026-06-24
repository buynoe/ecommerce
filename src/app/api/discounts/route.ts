import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const discounts = await prisma.discount.findMany({ where: { storeId: m.store!.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ discounts });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.title || !body.type || body.value === undefined) return NextResponse.json({ error: "title, type, value required" }, { status: 400 });
  const discount = await prisma.discount.create({
    data: { storeId: m.store!.id, ...body, productIds: JSON.stringify(body.productIds || []), collectionIds: JSON.stringify(body.collectionIds || []) },
  });
  return NextResponse.json({ discount }, { status: 201 });
}
