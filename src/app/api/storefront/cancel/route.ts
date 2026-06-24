import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendOrderCancelledEmail } from "@/lib/sendOrderEmail";

// Statuses a customer is allowed to cancel
const CANCELLABLE_STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, orderId, reason } = body;

  if (!storeId || !orderId) {
    return NextResponse.json({ error: "storeId and orderId are required" }, { status: 400 });
  }

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId, customerId: customer.id },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: `This order cannot be cancelled (status: ${order.status}). Orders that are already packed or shipped must be returned after delivery.` },
      { status: 400 }
    );
  }

  // Cancel order + write timeline in a transaction
  const [updated] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelReason: reason || "Cancelled by customer" },
    }),
    prisma.orderTimeline.create({
      data: {
        orderId,
        status: "CANCELLED",
        message: `Order cancelled by customer${reason ? `: ${reason}` : ""}`,
      },
    }),
  ]);

  // Send cancellation email (non-blocking)
  sendOrderCancelledEmail(orderId, reason).catch(() => {});

  return NextResponse.json({ order: updated });
}
