import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, orderId, provider } = body;

    if (!storeId || !orderId || !provider) {
      return NextResponse.json({ error: "storeId, orderId and provider are required" }, { status: 400 });
    }

    // Load order
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Already paid — idempotent
    if (order.status === "PAID" || order.status === "CONFIRMED") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // Load gateway secret (server-only)
    const gw = await prisma.paymentGateway.findUnique({
      where: { storeId_provider: { storeId, provider } },
    });
    if (!gw) return NextResponse.json({ error: "Gateway not found" }, { status: 404 });

    let config: Record<string, string> = {};
    try { config = JSON.parse(gw.config); } catch { /* empty */ }

    const { keyId, keySecret } = config;

    // ── RAZORPAY ───────────────────────────────────────────────────────────────
    if (provider === "RAZORPAY") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ error: "Missing Razorpay payment details" }, { status: 400 });
      }

      // Verify HMAC-SHA256 signature
      const expectedSig = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSig !== razorpay_signature) {
        return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
      }

      // Mark order paid
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      await prisma.payment.create({
        data: {
          orderId,
          gatewayId: gw.id,
          amount: order.total,
          currency: order.currency,
          status: "SUCCESS",
          gatewayOrderId: razorpay_order_id,
          gatewayPaymentId: razorpay_payment_id,
          gatewaySignature: razorpay_signature,
          method: "RAZORPAY",
        },
      });

      await prisma.orderTimeline.create({
        data: { orderId, status: "PAID", message: `Payment received via Razorpay (${razorpay_payment_id})` },
      });

      createNotification(
        storeId, "ORDER_PAID",
        `Payment received for ${order.orderNumber}`,
        `₹${order.total.toLocaleString("en-IN")} received via Razorpay`,
        `/dashboard/orders/${orderId}`,
      ).catch(() => {});

      return NextResponse.json({ success: true });
    }

    // ── CASHFREE ───────────────────────────────────────────────────────────────
    if (provider === "CASHFREE") {
      const { cfOrderId } = body;
      // cfOrderId is the Cashfree internal order id, or we can use our prefixed id
      const ourCfOrderId = `shop_${orderId}`;

      const isSandbox = keyId.startsWith("TEST") || keyId.toLowerCase().startsWith("test");
      const baseUrl = isSandbox ? "https://sandbox.cashfree.com/pg" : "https://api.cashfree.com/pg";

      // Query Cashfree to verify actual payment status
      const cfRes = await fetch(`${baseUrl}/orders/${ourCfOrderId}`, {
        method: "GET",
        headers: {
          "x-api-version": "2023-08-01",
          "x-client-id": keyId,
          "x-client-secret": keySecret,
        },
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) {
        console.error("[Cashfree verify]", cfData);
        return NextResponse.json({ error: "Could not verify payment with Cashfree" }, { status: 502 });
      }

      const cfStatus = cfData.order_status;
      if (cfStatus !== "PAID") {
        return NextResponse.json({ error: `Payment not completed. Status: ${cfStatus}` }, { status: 400 });
      }

      // Mark order paid
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
      });

      await prisma.payment.create({
        data: {
          orderId,
          gatewayId: gw.id,
          amount: order.total,
          currency: order.currency,
          status: "SUCCESS",
          gatewayOrderId: cfOrderId ?? ourCfOrderId,
          method: "CASHFREE",
        },
      });

      await prisma.orderTimeline.create({
        data: { orderId, status: "PAID", message: `Payment received via Cashfree (cf_order_id: ${cfData.cf_order_id})` },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  } catch (err) {
    console.error("[payment/verify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
