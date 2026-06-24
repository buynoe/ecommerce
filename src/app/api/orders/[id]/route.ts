import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelOrder, updateOrderStatus } from "@/lib/services/order.service";
import { createNotification } from "@/lib/notifications";
import {
  sendOrderConfirmedEmail, sendOrderShippedEmail,
  sendOrderDeliveredEmail, sendOrderCancelledEmail,
} from "@/lib/sendOrderEmail";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, storeId: m.store!.id },
    include: {
      items: { include: { product: { select: { title: true, images: { take: 1 } } } } },
      customer: true, payments: true, shipments: true,
      timeline: { orderBy: { createdAt: "asc" } },
      shippingMethod: true, returns: { include: { items: true } },
    },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status, message, cancelReason } = await req.json();

  if (cancelReason) {
    const order = await cancelOrder(id, cancelReason, m.store!.id);
    sendOrderCancelledEmail(id, cancelReason).catch(() => {});
    createNotification(m.store!.id, "ORDER_CANCELLED",
      `Order ${order.orderNumber} cancelled`,
      `Reason: ${cancelReason}`,
      `/dashboard/orders/${id}`,
    ).catch(() => {});
    return NextResponse.json({ order });
  }
  if (status) {
    const order = await updateOrderStatus(id, status, message);
    if (status === "CONFIRMED") sendOrderConfirmedEmail(id).catch(() => {});
    if (status === "SHIPPED")   sendOrderShippedEmail(id).catch(() => {});
    if (status === "DELIVERED") sendOrderDeliveredEmail(id).catch(() => {});
    if (status === "CANCELLED") sendOrderCancelledEmail(id).catch(() => {});

    const statusLabels: Record<string, { type: Parameters<typeof createNotification>[1]; title: string; msg: string }> = {
      PAID:       { type: "ORDER_PAID",      title: `Payment received for ${order.orderNumber}`, msg: `Order marked as paid` },
      CONFIRMED:  { type: "ORDER_CONFIRMED", title: `Order ${order.orderNumber} confirmed`,      msg: `Order confirmed and being processed` },
      SHIPPED:    { type: "ORDER_SHIPPED",   title: `Order ${order.orderNumber} shipped`,        msg: message || `Order has been shipped` },
      DELIVERED:  { type: "ORDER_DELIVERED", title: `Order ${order.orderNumber} delivered`,      msg: `Order successfully delivered` },
      CANCELLED:  { type: "ORDER_CANCELLED", title: `Order ${order.orderNumber} cancelled`,      msg: message || `Order was cancelled` },
      RETURNED:   { type: "ORDER_RETURNED",  title: `Order ${order.orderNumber} returned`,       msg: message || `Order has been returned` },
    };
    if (statusLabels[status]) {
      const { type, title, msg } = statusLabels[status];
      createNotification(m.store!.id, type, title, msg, `/dashboard/orders/${id}`).catch(() => {});
    }
    return NextResponse.json({ order });
  }
  return NextResponse.json({ error: "No action" }, { status: 400 });
}
