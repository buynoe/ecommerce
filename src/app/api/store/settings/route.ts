import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    store: m.store,
    merchant: {
      name: m.name, email: m.email, plan: m.plan,
      trialEndsAt: m.trialEndsAt, planRenewsAt: m.planRenewsAt,
      businessName: m.businessName, businessRegNo: m.businessRegNo,
      businessAddress: m.businessAddress, businessGst: m.businessGst,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Store fields
  const storeAllowed = ["name", "description", "logo", "favicon", "currency", "timezone", "language", "primaryColor", "email", "phone", "address", "metaTitle", "metaDesc", "socialLinks", "returnWindowDays", "reviewsEnabled", "reviewsRequireApproval", "emailSettings", "cloudinarySettings"];
  const storeData: Record<string, unknown> = {};
  for (const k of storeAllowed) if (body[k] !== undefined) storeData[k] = body[k];

  // Merchant business profile fields
  const merchantAllowed = ["businessName", "businessRegNo", "businessAddress", "businessGst"];
  const merchantData: Record<string, unknown> = {};
  for (const k of merchantAllowed) if (body[k] !== undefined) merchantData[k] = body[k];

  try {
    const [store] = await Promise.all([
      Object.keys(storeData).length ? prisma.store.update({ where: { id: m.store!.id }, data: storeData }) : Promise.resolve(m.store),
      Object.keys(merchantData).length ? prisma.merchant.update({ where: { id: m.id }, data: merchantData }) : Promise.resolve(null),
    ]);
    return NextResponse.json({ store });
  } catch (err) {
    console.error("[store/settings PATCH]", err);
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
