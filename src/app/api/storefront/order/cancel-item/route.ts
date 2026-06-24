import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyCustomerToken } from "@/lib/auth";

// Must match the CANCELLABLE constant in the account page UI
const CANCELLABLE_ORDER_STATUSES = new Set(["PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING"]);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, orderItemId, reason } = body;

  if (!storeId || !orderItemId) {
    return NextResponse.json({ error: "storeId and orderItemId required" }, { status: 400 });
  }

  // Verify customer auth
  const cookieStore = await cookies();
  const token = cookieStore.get(`customer-token-${storeId}`)?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const payload = verifyCustomerToken(token);
  if (!payload?.customerId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // ── Flat queries to avoid LibSQL nested-include crash ──────────────────────

  // 1. Load the item itself
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // 2. Load the order
  const order = await prisma.order.findUnique({ where: { id: item.orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Security: order must belong to this customer and store
  if (order.storeId !== storeId || order.customerId !== payload.customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can only cancel if order hasn't shipped yet
  if (!CANCELLABLE_ORDER_STATUSES.has(order.status)) {
    return NextResponse.json(
      { error: `Cannot cancel — order is already ${order.status.toLowerCase().replace(/_/g, " ")}. Please use the return flow.` },
      { status: 422 }
    );
  }

  // Item must still be active (treat NULL as ACTIVE for pre-migration rows)
  if (item.status && item.status !== "ACTIVE") {
    return NextResponse.json({ error: "This item is already cancelled or returned" }, { status: 422 });
  }

  // 3. Load all sibling items to recalculate totals
  const allItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });

  const refundAmount = item.total;

  // Mark item as cancelled
  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { status: "CANCELLED", cancelReason: reason || null, cancelledAt: new Date() },
  });

  // Remaining active siblings (treat NULL status as ACTIVE)
  const remainingActive = allItems.filter(
    i => i.id !== orderItemId && (!i.status || i.status === "ACTIVE")
  );
  const allCancelled = remainingActive.length === 0;

  // Recalculate order totals
  const newSubtotal = remainingActive.reduce((sum, i) => sum + i.total, 0);
  const newShipping = allCancelled ? 0 : order.shippingCost;
  const newTax = remainingActive.reduce((sum, i) => sum + i.taxAmount, 0);
  const newTotal = newSubtotal + newShipping + newTax;
  const shippingRefund = allCancelled ? order.shippingCost : 0;
  const totalRefund = refundAmount + shippingRefund;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      subtotal: newSubtotal,
      shippingCost: newShipping,
      taxAmount: newTax,
      total: newTotal,
      ...(allCancelled ? { status: "CANCELLED", cancelReason: `All items cancelled${reason ? `: ${reason}` : ""}` } : {}),
    },
  });

  // 4. Load most recent successful payment for gateway reference
  const successPayment = await prisma.payment.findFirst({
    where: { orderId: order.id, status: "SUCCESS" },
    orderBy: { createdAt: "desc" },
  });

  // Create refund payment record
  await prisma.payment.create({
    data: {
      orderId: order.id,
      gatewayId: successPayment?.gatewayId ?? null,
      amount: totalRefund,
      currency: order.currency,
      status: "REFUNDED",
      method: successPayment?.method ?? null,
      metadata: JSON.stringify({
        type: "REFUND",
        notes: `Item cancellation — ${item.variantTitle || item.title}${reason ? ` (${reason})` : ""}`,
        cancelledItemId: orderItemId,
      }),
    },
  });

  // Timeline entry
  await prisma.orderTimeline.create({
    data: {
      orderId: order.id,
      status: allCancelled ? "CANCELLED" : "ITEM_CANCELLED",
      message: `${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ""} cancelled. Refund of ₹${totalRefund.toFixed(2)} initiated.${allCancelled ? " All items cancelled." : ""}`,
      createdBy: "customer",
    },
  });

  return NextResponse.json({
    success: true,
    refundAmount: totalRefund,
    orderCancelled: allCancelled,
    message: `Item cancelled. ₹${totalRefund.toFixed(2)} will be refunded to your original payment method within 5–7 business days.`,
  });
}
