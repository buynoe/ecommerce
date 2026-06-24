import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id, orderId } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: { store: { select: { id: true } } },
  });
  if (!merchant?.store) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId: merchant.store.id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, title: true } },
          variant: { select: { id: true, title: true, sku: true } },
        },
      },
      payments: true,
      shipments: true,
      timeline: { orderBy: { createdAt: "desc" } },
      coupon: { select: { code: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order, merchant: { id: merchant.id, name: merchant.name, email: merchant.email } });
}
