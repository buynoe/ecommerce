import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderNumber = searchParams.get("orderNumber");
  const orderId = searchParams.get("orderId");
  const storeId = searchParams.get("storeId");

  if ((!orderNumber && !orderId) || !storeId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const where = orderId ? { id: orderId, storeId } : { orderNumber: orderNumber!, storeId };

  const order = await prisma.order.findFirst({
    where,
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { position: "asc" } },
                },
              },
            },
          },
        },
      },
      shipments: { orderBy: { createdAt: "desc" }, take: 1 },
      coupon: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Parse JSON address snapshots
  let shippingAddress = null;
  let billingAddress = null;
  try { shippingAddress = JSON.parse(order.shippingAddress); } catch { /* empty */ }
  try { billingAddress = JSON.parse(order.billingAddress); } catch { /* empty */ }

  return NextResponse.json({
    order: {
      ...order,
      shippingAddress,
      billingAddress,
      // Normalize field names for the client
      shippingAmount: order.shippingCost,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.total,
      paymentStatus: order.status,
    },
  });
}
