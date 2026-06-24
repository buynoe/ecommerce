import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Update without nested includes (LibSQL limitation)
  const review = await prisma.review.update({
    where: { id },
    data: { status },
  });

  // Fetch related data separately
  const [product, customer] = await Promise.all([
    prisma.product.findUnique({
      where: { id: review.productId },
      select: { id: true, title: true },
    }),
    review.customerId
      ? prisma.customer.findUnique({
          where: { id: review.customerId },
          select: { firstName: true, lastName: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ review: { ...review, product, customer } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
