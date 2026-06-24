import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const coupons = await prisma.coupon.findMany({ where: { storeId: m.store!.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.code || !body.type || body.value === undefined) return NextResponse.json({ error: "code, type, value required" }, { status: 400 });
  const existing = await prisma.coupon.findUnique({ where: { storeId_code: { storeId: m.store!.id, code: body.code.toUpperCase() } } });
  if (existing) return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
  const coupon = await prisma.coupon.create({
    data: { storeId: m.store!.id, ...body, code: body.code.toUpperCase(), productIds: JSON.stringify(body.productIds || []), collectionIds: JSON.stringify(body.collectionIds || []) },
  });
  return NextResponse.json({ coupon }, { status: 201 });
}
