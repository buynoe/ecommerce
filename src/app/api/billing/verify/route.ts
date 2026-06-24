import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, merchantPlanUpgradedEmail, merchantPaymentSuccessEmail } from "@/lib/email";
import { getPlatformEmail, getPlatformRazorpay } from "@/lib/platform";

export async function POST(req: NextRequest) {
  const merchant = await requireMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const { keySecret } = await getPlatformRazorpay();
  if (!keySecret || keySecret.includes("XXXX")) {
    return NextResponse.json({ error: "Razorpay not configured" }, { status: 500 });
  }

  // Verify HMAC signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto.createHmac("sha256", keySecret).update(body).digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed. Invalid signature." }, { status: 400 });
  }

  const validPlans = ["BASIC", "PRO", "ENTERPRISE"];
  if (!validPlans.includes(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  // Get plan details from DB
  const planRecord = await prisma.plan.findFirst({ where: { key: plan, isActive: true } });
  const amount = planRecord?.price ?? 0;
  const planName = planRecord?.name ?? plan;

  const invoiceNumber = `INV-${Date.now()}-${merchant.id.slice(-6).toUpperCase()}`;
  const nextBillingDate = new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const [updated] = await Promise.all([
    prisma.merchant.update({
      where: { id: merchant.id },
      data: { plan, planStatus: "ACTIVE", trialEndsAt: null, planRenewsAt: new Date(Date.now() + 30 * 86400000) },
    }),
    prisma.merchantTransaction.create({
      data: {
        merchantId: merchant.id,
        invoiceNumber,
        plan,
        amount,
        currency: "INR",
        status: "SUCCESS",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        description: `Subscription upgrade to ${planName} plan`,
      },
    }),
  ]);

  // Send merchant emails (best-effort, don't fail payment on email error)
  try {
    const { smtp, emailPlanUpgrade, emailPayment } = await getPlatformEmail();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";

    if (emailPlanUpgrade) {
      await sendEmail(
        { to: merchant.email, subject: `Your Buynoe plan has been upgraded to ${planName}`, html: merchantPlanUpgradedEmail(merchant.name, planName, amount / 100, invoiceNumber, nextBillingDate) },
        smtp
      );
    }
    if (emailPayment) {
      await sendEmail(
        { to: merchant.email, subject: `Payment confirmed — ₹${(amount / 100).toLocaleString("en-IN")}`, html: merchantPaymentSuccessEmail(merchant.name, planName, amount / 100, invoiceNumber, razorpay_payment_id) },
        smtp
      );
    }
    void appUrl; // suppress unused warning
  } catch (e) {
    console.error("[billing/verify] Email send failed:", e);
  }

  return NextResponse.json({
    success: true,
    plan: updated.plan,
    message: `Successfully upgraded to ${planName} plan!`,
    paymentId: razorpay_payment_id,
  });
}
