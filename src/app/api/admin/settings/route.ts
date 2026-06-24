import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ALL_PLATFORM_KEYS, getPlatformEmail } from "@/lib/platform";

const MASKED_KEYS = new Set(["RAZORPAY_KEY_SECRET", "CASHFREE_SECRET_KEY", "SMTP_PASS", "SENDGRID_API_KEY"]);

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: ALL_PLATFORM_KEYS } },
  });

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = MASKED_KEYS.has(row.key) && row.value ? "••••••••" : row.value;
  }

  // Fill env-based defaults for display
  const envDefaults: Record<string, string> = {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    SMTP_HOST: process.env.SMTP_HOST || "",
    SMTP_PORT: process.env.SMTP_PORT || "587",
    SMTP_USER: process.env.SMTP_USER || "",
    SMTP_FROM: process.env.SMTP_FROM || "Buynoe <noreply@buynoe.com>",
    SENDGRID_FROM: process.env.SENDGRID_FROM || "Buynoe <noreply@buynoe.com>",
    CASHFREE_ENV: "sandbox",
    EMAIL_PROVIDER: "smtp",
    RAZORPAY_ENABLED: "true",
    CASHFREE_ENABLED: "false",
    EMAIL_SIGNUP: "true",
    EMAIL_PLAN_UPGRADE: "true",
    EMAIL_PLAN_EXPIRY: "true",
    EMAIL_PAYMENT: "true",
  };
  for (const [k, v] of Object.entries(envDefaults)) {
    if (!settings[k]) settings[k] = v;
  }

  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.action === "test-email") {
    const { smtp } = await getPlatformEmail();
    const ok = await sendEmail(
      {
        to: body.to || admin.email,
        subject: "Buynoe — Test Email",
        html: `<div style="font-family:sans-serif;padding:32px;max-width:480px">
          <div style="font-size:20px;font-weight:900;background:linear-gradient(90deg,#ec1f78,#ff6e30);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px">Buynoe</div>
          <h2 style="color:#111;margin:0 0 8px">Test Email ✓</h2>
          <p style="color:#6b7280">Your email settings are configured correctly. This is a test email from Buynoe Admin Console.</p>
        </div>`,
      },
      smtp
    );
    return NextResponse.json({ ok, message: ok ? "Test email sent successfully!" : "Failed to send — check your email credentials." });
  }

  // Save settings — skip masked placeholder values to avoid overwriting real secrets
  const updates: { key: string; value: string }[] = [];
  for (const key of ALL_PLATFORM_KEYS) {
    if (body[key] === undefined) continue;
    if (MASKED_KEYS.has(key) && body[key] === "••••••••") continue;
    updates.push({ key, value: String(body[key]) });
  }

  for (const u of updates) {
    await prisma.platformSetting.upsert({
      where: { key: u.key },
      update: { value: u.value },
      create: { key: u.key, value: u.value },
    });
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
