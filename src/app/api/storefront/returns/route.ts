import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: create a return request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, orderId, items, reason } = body;

  if (!storeId || !orderId || !items?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify order belongs to customer
  const order = await prisma.order.findFirst({
    where: { id: orderId, storeId, customerId: customer.id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Only delivered orders can be returned
  if (!["DELIVERED", "RETURNED"].includes(order.status)) {
    return NextResponse.json({ error: "Only delivered orders can be returned" }, { status: 400 });
  }

  // Check for existing return
  const existingReturn = await prisma.return.findFirst({ where: { orderId } });
  if (existingReturn) {
    return NextResponse.json({ error: "A return request already exists for this order" }, { status: 400 });
  }

  // Calculate refund amount
  const refundAmount = items.reduce((sum: number, item: { orderItemId: string; quantity: number }) => {
    const orderItem = order.items.find(i => i.id === item.orderItemId);
    return sum + (orderItem ? orderItem.price * item.quantity : 0);
  }, 0);

  const returnRequest = await prisma.return.create({
    data: {
      orderId,
      status: "REQUESTED",
      reason,
      refundAmount,
      items: {
        create: items.map((item: { orderItemId: string; quantity: number; reason?: string }) => ({
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason || reason,
        })),
      },
    },
    include: { items: true },
  });

  // Update order status
  await prisma.order.update({ where: { id: orderId }, data: { status: "RETURNED" } });
  await prisma.orderTimeline.create({
    data: { orderId, status: "RETURNED", message: `Return requested: ${reason}` },
  });

  return NextResponse.json({ return: returnRequest });
}

// GET: get returns for customer
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const orderId = searchParams.get("orderId");

  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const returns = await prisma.return.findMany({
    where: {
      order: { customerId: customer.id, storeId },
      ...(orderId ? { orderId } : {}),
    },
    include: {
      items: { include: { orderItem: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ returns });
}
