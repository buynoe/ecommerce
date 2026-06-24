import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMerchant } from "@/lib/auth";
import { sendEmail, merchantVerificationEmail } from "@/lib/email";
import { getPlatformEmail } from "@/lib/platform";
import { randomUUID } from "crypto";

export async function POST() {
  const merchant = await getMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (merchant.emailVerified) return NextResponse.json({ message: "Already verified" });

  const emailVerifyToken = randomUUID();
  const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { emailVerifyToken, emailVerifyExpiry },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${emailVerifyToken}`;
  const { smtp } = await getPlatformEmail();
  await sendEmail({
    to: merchant.email,
    subject: "Verify your Buynoe email address",
    html: merchantVerificationEmail(merchant.name, verifyUrl),
  }, smtp);

  return NextResponse.json({ success: true });
}
