import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SHIPPING_PROVIDERS } from "@/lib/utils";

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const methods = await prisma.shippingMethod.findMany({ where: { storeId: m.store!.id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ methods, providers: SHIPPING_PROVIDERS });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  // Book shipment for order
  if (body.action === "book") {
    const { orderId, provider, methodId } = body;
    const awbCode = `${(provider || "SE").substring(0, 3).toUpperCase()}${Date.now()}`;
    const providerInfo = SHIPPING_PROVIDERS.find(p => p.id === provider);
    const shipment = await prisma.shipment.create({
      data: {
        orderId, shippingMethodId: methodId,
        provider, awbCode, trackingNumber: awbCode,
        trackingUrl: providerInfo ? `${providerInfo.trackingUrl}${awbCode}` : undefined,
        status: "BOOKED",
        estimatedDelivery: new Date(Date.now() + 5 * 86400000),
      },
    });
    await prisma.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
    await prisma.orderTimeline.create({ data: { orderId, status: "SHIPPED", message: `Shipped via ${provider}, AWB: ${awbCode}` } });
    return NextResponse.json({ shipment });
  }
  // Create/update shipping method
  const method = await prisma.shippingMethod.create({ data: { storeId: m.store!.id, ...body } });
  return NextResponse.json({ method }, { status: 201 });
}
