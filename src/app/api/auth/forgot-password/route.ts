import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getPlatformEmail } from "@/lib/platform";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const merchant = await prisma.merchant.findUnique({ where: { email: email.trim().toLowerCase() } });

  // Always return success to prevent email enumeration
  if (!merchant) return NextResponse.json({ success: true });

  const token = randomUUID();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const { smtp } = await getPlatformEmail();

  await sendEmail({
    to: merchant.email,
    subject: "Reset your Buynoe password",
    html: resetPasswordEmail(merchant.name, resetUrl),
  }, smtp);

  return NextResponse.json({ success: true });
}

function resetPasswordEmail(name: string, resetUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <tr>
    <td style="background:#ffffff;border-radius:14px 14px 0 0;padding:24px 36px 20px;border-bottom:3px solid #ec1f78;">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40" height="40" style="background:#ec1f78;border-radius:10px;text-align:center;vertical-align:middle;">
          <span style="color:#fff;font-size:22px;font-weight:900;line-height:40px;display:block;">B</span>
        </td>
        <td width="10"></td>
        <td valign="middle"><span style="font-size:22px;font-weight:900;color:#ec1f78;">Buynoe</span></td>
      </tr></table>
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;padding:32px 36px 28px;">
      <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Reset your password</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
        Hi <strong style="color:#374151;">${name}</strong>, we received a request to reset your Buynoe account password. Click the button below to set a new password.
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
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
        This link expires in <strong style="color:#374151;">1 hour</strong>. If you didn&apos;t request a password reset, you can safely ignore this email.
      </p>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;line-height:1.6;">
        Link not working? Copy this into your browser:<br>
        <a href="${resetUrl}" style="color:#ec1f78;word-break:break-all;">${resetUrl}</a>
      </p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:18px 36px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Buynoe Technologies &middot; <a href="https://buynoe.com" style="color:#ec1f78;text-decoration:none;">buynoe.com</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}
