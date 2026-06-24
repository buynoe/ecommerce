import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, merchantTrialExpiringEmail, merchantTrialExpiredEmail } from "@/lib/email";
import { getPlatformEmail } from "@/lib/platform";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const upgradeUrl = `${appUrl}/dashboard/billing`;

  const { smtp, emailPlanExpiry: enabled } = await getPlatformEmail();

  const results = { expiringSoon: 0, justExpired: 0, emailsSent: 0, errors: 0 };

  if (!enabled) {
    return NextResponse.json({ ok: true, message: "Trial expiry emails disabled in settings", results });
  }

  // 1. Find trial merchants expiring in 7 days (within 24h window to avoid double-sending)
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const in6Days = new Date(now.getTime() + 6 * 86400000);

  const expiringSoon = await prisma.merchant.findMany({
    where: {
      plan: "TRIAL",
      trialEndsAt: { gte: in6Days, lte: in7Days },
    },
  });

  for (const m of expiringSoon) {
    results.expiringSoon++;
    try {
      const daysLeft = Math.ceil((m.trialEndsAt!.getTime() - now.getTime()) / 86400000);
      const ok = await sendEmail(
        { to: m.email, subject: `Your Buynoe trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`, html: merchantTrialExpiringEmail(m.name, daysLeft, upgradeUrl) },
        smtp
      );
      if (ok) results.emailsSent++; else results.errors++;
    } catch {
      results.errors++;
    }
  }

  // 2. Find trial merchants whose trial just expired (within last 24h)
  const yesterday = new Date(now.getTime() - 86400000);

  const justExpired = await prisma.merchant.findMany({
    where: {
      plan: "TRIAL",
      trialEndsAt: { gte: yesterday, lte: now },
    },
  });

  for (const m of justExpired) {
    results.justExpired++;
    try {
      const ok = await sendEmail(
        { to: m.email, subject: "Your Buynoe free trial has ended — upgrade to continue", html: merchantTrialExpiredEmail(m.name, upgradeUrl) },
        smtp
      );
      if (ok) results.emailsSent++; else results.errors++;
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), results });
}
