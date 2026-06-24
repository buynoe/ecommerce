import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { email, storeSlug } = await req.json();
  if (!email || !storeSlug) return NextResponse.json({ error: "Email and store required" }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const customer = await prisma.customer.findFirst({
    where: { storeId: store.id, email: email.trim().toLowerCase() },
  });

  // Always success — prevent email enumeration
  if (!customer) return NextResponse.json({ success: true });

  const token = randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const resetUrl = `${appUrl}/store/${storeSlug}/reset-password?token=${token}`;

  await sendEmail({
    to: customer.email,
    subject: `Reset your password — ${store.name}`,
    html: customerResetEmail(store.name, `${customer.firstName} ${customer.lastName}`, resetUrl),
  });

  return NextResponse.json({ success: true });
}

function customerResetEmail(storeName: string, name: string, resetUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr>
    <td style="background:#ffffff;border-radius:14px 14px 0 0;padding:24px 36px;border-bottom:3px solid #ec1f78;">
      <p style="margin:0;font-size:18px;font-weight:800;color:#ec1f78;">${storeName}</p>
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;padding:32px 36px 28px;">
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Reset your password</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
        Hi <strong style="color:#374151;">${name}</strong>, click the button below to reset your password for ${storeName}.
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
        <tr>
          <td align="center" bgcolor="#ec1f78" style="border-radius:10px;">
            <a href="${resetUrl}" target="_blank"
               style="display:inline-block;background:#ec1f78;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 32px;border-radius:10px;">
              Reset Password &rarr;
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
        This link expires in <strong style="color:#374151;">1 hour</strong>. If you didn&apos;t request this, you can ignore this email.
      </p>
      <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;word-break:break-all;">
        <a href="${resetUrl}" style="color:#ec1f78;">${resetUrl}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:18px 36px;text-align:center;border-top:1px solid #f3f4f6;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Powered by <a href="https://buynoe.com" style="color:#ec1f78;text-decoration:none;">Buynoe</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}
