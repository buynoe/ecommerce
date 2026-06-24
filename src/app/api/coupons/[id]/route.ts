import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon || coupon.storeId !== m.store!.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.coupon.update({ where: { id }, data: body });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon || coupon.storeId !== m.store!.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Remove related CouponUse records first to avoid FK constraint
  await prisma.couponUse.deleteMany({ where: { couponId: id } });
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
