import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendReturnApprovedEmail } from "@/lib/sendOrderEmail";

const VALID_TRANSITIONS: Record<string, string[]> = {
  REQUESTED:        ["APPROVED", "REJECTED"],
  APPROVED:         ["PICKUP_SCHEDULED", "REJECTED"],
  PICKUP_SCHEDULED: ["RECEIVED"],
  RECEIVED:         ["INSPECTED"],
  INSPECTED:        ["REFUNDED", "REJECTED"],
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const ret = await prisma.return.findFirst({
    where: { id, order: { storeId: m.store!.id } },
    include: {
      order: {
        include: {
          customer: true,
          items: { include: { product: { select: { title: true, images: { take: 1 } } } } },
        },
      },
      items: {
        include: {
          orderItem: { include: { product: { select: { title: true, images: { take: 1 } } } } },
        },
      },
    },
  });
  if (!ret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ return: ret });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status, notes, refundAmount } = await req.json();

  const ret = await prisma.return.findFirst({
    where: { id, order: { storeId: m.store!.id } },
  });
  if (!ret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (status) {
    const allowed = VALID_TRANSITIONS[ret.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot move from ${ret.status} to ${status}. Allowed: ${allowed.join(", ") || "none"}` },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.return.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(refundAmount !== undefined && { refundAmount }),
    },
    include: {
      order: { select: { orderNumber: true, email: true } },
      items: { include: { orderItem: true } },
    },
  });

  // Send return approved email (non-blocking)
  if (status === "APPROVED") {
    sendReturnApprovedEmail(ret.orderId).catch(() => {});
  }

  // If REFUNDED, update parent order too
  if (status === "REFUNDED") {
    await prisma.order.update({ where: { id: ret.orderId }, data: { status: "REFUNDED" } });
    await prisma.orderTimeline.create({
      data: { orderId: ret.orderId, status: "REFUNDED", message: `Return refunded — ₹${refundAmount ?? ret.refundAmount ?? 0}` },
    });
  }
  if (status === "REJECTED") {
    await prisma.order.update({ where: { id: ret.orderId }, data: { status: "DELIVERED" } });
    await prisma.orderTimeline.create({
      data: { orderId: ret.orderId, status: "DELIVERED", message: "Return request rejected — order restored to Delivered" },
    });
  }

  return NextResponse.json({ return: updated });
}
