import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/services/order.service";
import { applyCoupon } from "@/lib/services/discount.service";
import { createNotification } from "@/lib/notifications";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Coupon preview action (called from checkout page Apply button) ─────────
    if (body.action === "applyCoupon") {
      const { storeId, code, orderAmount } = body;
      if (!storeId || !code) return NextResponse.json({ error: "storeId and code required" }, { status: 400 });
      try {
        const result = await applyCoupon(storeId, code.trim().toUpperCase(), orderAmount || 0);
        return NextResponse.json({ discount: result.discount, isFreeShipping: result.isFreeShipping, coupon: { type: result.coupon.type, value: result.coupon.value } });
      } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
    }

    // ── Full checkout ─────────────────────────────────────────────────────────
    const { storeId, email, phone, shippingAddress, billingAddress, shippingMethodId, paymentGatewayId, couponCode, notes, cartSessionId, customerId } = body;

    if (!storeId || !email || !shippingAddress) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Get cart
    const cookieStore = await cookies();
    const sessionId = cartSessionId || cookieStore.get(`cart-${storeId}`)?.value;
    if (!sessionId) return NextResponse.json({ error: "No cart found" }, { status: 400 });

    const cart = await prisma.cart.findFirst({
      where: { storeId, sessionId },
      include: { items: { where: { savedForLater: false }, include: { variant: { include: { inventoryItem: true } } } } },
    });
    if (!cart || cart.items.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

    const shippingMethod = shippingMethodId ? await prisma.shippingMethod.findUnique({ where: { id: shippingMethodId } }) : null;
    const shippingCost = shippingMethod?.price || 0;
    const subtotal = cart.items.reduce((s, item) => s + item.variant.price * item.quantity, 0);

    // Apply coupon
    let discountAmount = 0, isFreeShipping = false, couponId: string | undefined;
    if (couponCode) {
      try {
        const result = await applyCoupon(storeId, couponCode.trim().toUpperCase(), subtotal, customerId);
        discountAmount = result.discount;
        isFreeShipping = result.isFreeShipping;
        couponId = result.coupon.id;
      } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message }, { status: 400 });
      }
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * 0.18;

    const order = await createOrder({
      storeId, email, phone, customerId: customerId || undefined,
      items: cart.items.map(item => ({
        variantId: item.variantId, quantity: item.quantity, price: item.variant.price,
        compareAtPrice: item.variant.compareAtPrice || undefined,
      })),
      shippingAddress, billingAddress: billingAddress || shippingAddress,
      shippingMethodId, shippingCost: isFreeShipping ? 0 : shippingCost,
      taxAmount, discountAmount, couponId, paymentGatewayId, notes,
    });

    if (couponId) {
      await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await prisma.couponUse.create({ data: { couponId, orderId: order.id, customerId: customerId || null } });
    }

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Fire-and-forget notification to merchant
    createNotification(
      storeId,
      "ORDER_NEW",
      `New order ${order.orderNumber}`,
      `${email} placed an order for ${order.items?.length ?? 1} item(s) — total ₹${order.total.toLocaleString("en-IN")}`,
      `/dashboard/orders/${order.id}`,
    ).catch(() => {});

    return NextResponse.json({ order });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message || "Checkout failed" }, { status: 500 });
  }
}
