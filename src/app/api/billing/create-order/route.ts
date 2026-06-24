import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformRazorpay } from "@/lib/platform";

export async function POST(req: NextRequest) {
  const merchant = await requireMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const planRecord = await prisma.plan.findFirst({ where: { key: plan, isActive: true } });
  if (!planRecord) return NextResponse.json({ error: "Plan not found" }, { status: 400 });

  const { keyId, keySecret, enabled } = await getPlatformRazorpay();
  if (!enabled || !keyId || !keySecret || keyId.includes("XXXX")) {
    return NextResponse.json({ error: "Razorpay is not configured. Please contact support." }, { status: 500 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let order: any;
  try {
    order = await razorpay.orders.create({
      amount: planRecord.price,
      currency: "INR",
      receipt: `plan_${plan}_${merchant.id.slice(-8)}_${Date.now() % 1e8}`,
      notes: { merchantId: merchant.id, merchantEmail: merchant.email, plan },
    });
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "error" in err
      ? (err as { error: { description: string } }).error.description
      : "Failed to create payment order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    plan,
    planName: `Buynoe ${planRecord.name} — ₹${(planRecord.price / 100).toLocaleString("en-IN")}/mo`,
    keyId,
    merchantName: merchant.name,
    merchantEmail: merchant.email,
  });
}
