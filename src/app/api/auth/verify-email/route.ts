import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, merchantWelcomeEmail } from "@/lib/email";
import { getPlatformEmail } from "@/lib/platform";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=invalid", req.url));
  }

  const merchant = await prisma.merchant.findFirst({
    where: { emailVerifyToken: token, emailVerified: false },
    include: { store: true },
  });

  if (!merchant) {
    return NextResponse.redirect(new URL("/login?verified=invalid", req.url));
  }

  if (merchant.emailVerifyExpiry && merchant.emailVerifyExpiry < new Date()) {
    return NextResponse.redirect(new URL("/login?verified=expired", req.url));
  }

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
  });

  // Send welcome email after verification (best-effort)
  try {
    const { smtp, emailSignup } = await getPlatformEmail();
    if (emailSignup) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
      await sendEmail(
        { to: merchant.email, subject: "Welcome to Buynoe — your store is live!", html: merchantWelcomeEmail(merchant.name, merchant.store?.name ?? "your store", `${appUrl}/dashboard`) },
        smtp
      );
    }
  } catch (e) {
    console.error("[verify-email] Welcome email failed:", e);
  }

  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
