import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { storeId, orderId, provider } = await req.json();
    if (!storeId || !orderId || !provider) {
      return NextResponse.json({ error: "storeId, orderId and provider are required" }, { status: 400 });
    }

    // Load order (use server-authoritative total — never trust client amount)
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
      select: { id: true, orderNumber: true, total: true, currency: true, email: true, phone: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Load gateway config (server-only — never sent to client)
    const gw = await prisma.paymentGateway.findUnique({
      where: { storeId_provider: { storeId, provider } },
    });
    if (!gw || !gw.isActive) {
      return NextResponse.json({ error: "Payment gateway not configured or inactive" }, { status: 400 });
    }

    let config: Record<string, string> = {};
    try { config = JSON.parse(gw.config); } catch { /* empty */ }

    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Gateway API keys are not configured" }, { status: 400 });
    }

    // ── RAZORPAY ───────────────────────────────────────────────────────────────
    if (provider === "RAZORPAY") {
      const amountInPaise = Math.round(order.total * 100); // Razorpay uses paise
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: order.currency || "INR",
          receipt: order.orderNumber,
          notes: { orderId: order.id },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) {
        console.error("[Razorpay create-order]", rzpData);
        return NextResponse.json({ error: rzpData.error?.description || "Razorpay order creation failed" }, { status: 502 });
      }

      return NextResponse.json({
        provider: "RAZORPAY",
        razorpayOrderId: rzpData.id,
        keyId,                         // Public key — safe to send to client
        amount: amountInPaise,
        currency: order.currency || "INR",
        orderNumber: order.orderNumber,
        email: order.email,
        phone: order.phone ?? "",
      });
    }

    // ── CASHFREE ───────────────────────────────────────────────────────────────
    if (provider === "CASHFREE") {
      // Auto-detect sandbox vs production from key prefix
      const isSandbox = keyId.startsWith("TEST") || keyId.toLowerCase().startsWith("test");
      const baseUrl = isSandbox
        ? "https://sandbox.cashfree.com/pg"
        : "https://api.cashfree.com/pg";

      // Build the return URL for after payment
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = host.startsWith("localhost") ? "http" : "https";
      const store = await prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } });
      const returnUrl = `${protocol}://${host}/store/${store?.slug}/payment-callback?orderId=${order.id}&storeId=${storeId}&provider=CASHFREE`;

      const cfRes = await fetch(`${baseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-version": "2023-08-01",
          "x-client-id": keyId,
          "x-client-secret": keySecret,
        },
        body: JSON.stringify({
          order_id: `shop_${order.id}`,          // Must be unique; prefix to avoid numeric-only IDs
          order_amount: order.total,
          order_currency: order.currency || "INR",
          customer_details: {
            customer_id: order.id,
            customer_email: order.email,
            customer_phone: order.phone || "9999999999",
          },
          order_meta: {
            return_url: returnUrl,
          },
        }),
      });

      const cfData = await cfRes.json();
      if (!cfRes.ok) {
        console.error("[Cashfree create-order]", cfData);
        return NextResponse.json({ error: cfData.message || "Cashfree order creation failed" }, { status: 502 });
      }

      return NextResponse.json({
        provider: "CASHFREE",
        paymentSessionId: cfData.payment_session_id,
        cfOrderId: cfData.cf_order_id,
        mode: isSandbox ? "sandbox" : "production",
      });
    }

    return NextResponse.json({ error: "Unsupported payment provider" }, { status: 400 });
  } catch (err) {
    console.error("[payment/create-order]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
