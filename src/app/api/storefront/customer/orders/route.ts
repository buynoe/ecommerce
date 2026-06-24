import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Step 1: fetch orders with items only (safest query)
    const orders = await prisma.order.findMany({
      where: { storeId, customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                title: true,
                images: { take: 1, select: { url: true, alt: true } },
              },
            },
            variant: { select: { title: true } },
          },
        },
      },
    });

    // Step 2: fetch supporting data per order in separate queries (avoids LibSQL nested relation issues)
    const orderIds = orders.map(o => o.id);

    const [timelines, shipments, returns, store] = await Promise.all([
      prisma.orderTimeline.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { createdAt: "desc" },
        select: { orderId: true, status: true, message: true, createdAt: true },
      }),
      prisma.shipment.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { createdAt: "desc" },
        select: {
          orderId: true, provider: true, courierName: true,
          trackingNumber: true, trackingUrl: true,
          estimatedDelivery: true, deliveredAt: true,
        },
      }),
      prisma.return.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { createdAt: "desc" },
        select: { orderId: true, id: true, status: true, createdAt: true },
      }),
      prisma.store.findUnique({ where: { id: storeId } }),
    ]);

    const returnWindowDays = store?.returnWindowDays ?? 7;

    // Index by orderId (keep only first per order)
    const timelineMap: Record<string, typeof timelines[0]> = {};
    for (const t of timelines) if (!timelineMap[t.orderId]) timelineMap[t.orderId] = t;

    const shipmentMap: Record<string, typeof shipments[0]> = {};
    for (const s of shipments) if (!shipmentMap[s.orderId]) shipmentMap[s.orderId] = s;

    const returnMap: Record<string, typeof returns[0]> = {};
    for (const r of returns) if (!returnMap[r.orderId]) returnMap[r.orderId] = r;

    const normalized = orders.map(order => {
      const shipment = shipmentMap[order.id];
      const orderReturn = returnMap[order.id];

      let returnDeadline: string | null = null;
      let returnEligible = false;

      if (order.status === "DELIVERED") {
        const deliveredAt = shipment?.deliveredAt ?? order.updatedAt;
        const deadline = new Date(deliveredAt);
        deadline.setDate(deadline.getDate() + returnWindowDays);
        returnDeadline = deadline.toISOString();
        returnEligible = deadline > new Date();
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        shippingCost: order.shippingCost,
        taxAmount: order.taxAmount,
        currency: order.currency,
        cancelReason: order.cancelReason,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        returnDeadline,
        returnEligible,
        returnWindowDays,
        timeline: timelineMap[order.id] ? [timelineMap[order.id]] : [],
        shipments: shipment ? [shipment] : [],
        returns: orderReturn ? [orderReturn] : [],
        items: order.items.map(item => ({
          id: item.id,
          title: item.title,
          variantTitle: item.variantTitle ?? item.variant?.title ?? null,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          status: item.status ?? "ACTIVE",
          cancelReason: item.cancelReason ?? null,
          product: {
            title: item.product?.title ?? item.title,
            images: item.product?.images ?? [],
          },
        })),
      };
    });

    return NextResponse.json({ orders: normalized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[customer/orders] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
