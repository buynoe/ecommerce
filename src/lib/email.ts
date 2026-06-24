import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

function createTransporter(smtpConfig?: SmtpConfig) {
  const host = smtpConfig?.host || process.env.SMTP_HOST;
  const port = smtpConfig?.port || parseInt(process.env.SMTP_PORT || "587");
  const user = smtpConfig?.user || process.env.SMTP_USER;
  const pass = smtpConfig?.pass || process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: EmailOptions, smtpConfig?: SmtpConfig): Promise<boolean> {
  const transporter = createTransporter(smtpConfig);
  if (!transporter) return false;

  try {
    const from = options.from
      || smtpConfig?.from
      || process.env.SMTP_FROM
      || `"Buynoe" <${smtpConfig?.user || process.env.SMTP_USER}>`;

    await transporter.sendMail({ from, to: options.to, subject: options.subject, html: options.html });
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err instanceof Error ? err.message : err);
    return false;
  }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

// Inline button — table-wrapped so Outlook respects the background colour
function btn(label: string, url: string, color = "#ec1f78") {
  return `
<table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;">
  <tr>
    <td align="center" bgcolor="${color}" style="border-radius:10px;">
      <a href="${url}" target="_blank"
         style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 32px;border-radius:10px;letter-spacing:0.2px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`;
}

// Buynoe logo row — works in Gmail, Outlook, Apple Mail
const LOGO_ROW = `
<table cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="40" height="40" style="background:#ec1f78;border-radius:10px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-size:22px;font-weight:900;line-height:40px;display:block;">B</span>
    </td>
    <td width="10"></td>
    <td valign="middle">
      <span style="font-size:22px;font-weight:900;color:#ec1f78;letter-spacing:-0.5px;font-family:Arial,sans-serif;">Buynoe</span>
    </td>
  </tr>
</table>`;

// ── Store-facing template (customer order emails) ─────────────────────────────

function baseTemplate(storeName: string, content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <!-- Header -->
  <tr>
    <td style="background:#ffffff;border-radius:14px 14px 0 0;padding:24px 36px;border-bottom:3px solid #ec1f78;">
      <p style="margin:0;font-size:18px;font-weight:800;color:#ec1f78;font-family:Arial,sans-serif;">${storeName}</p>
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="background:#ffffff;padding:32px 36px;">
      ${content}
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:18px 36px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">You received this email because you placed an order at <strong>${storeName}</strong>.<br>Powered by <a href="https://buynoe.com" style="color:#ec1f78;text-decoration:none;">Buynoe</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function orderConfirmedEmail(storeName: string, orderNumber: string, firstName: string, total: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">&#127881; Order Confirmed!</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, thank you for your order! We&apos;ve received it and are getting it ready for you.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:12px;color:#6b7280;">Order Number</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#16a34a;">#${orderNumber}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#374151;">Total: <strong>${total}</strong></p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">We&apos;ll send you another email when your order ships. Keep an eye on your inbox!</p>
  `);
}

export function orderShippedEmail(storeName: string, orderNumber: string, firstName: string, trackingNumber?: string, trackingUrl?: string, provider?: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">&#128230; Your Order is on the Way!</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, great news! Your order has been shipped and is heading your way.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:12px;color:#6b7280;">Order Number</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#16a34a;">#${orderNumber}</p>
        ${provider ? `<p style="margin:4px 0 0;font-size:14px;color:#374151;">Courier: <strong>${provider}</strong></p>` : ""}
        ${trackingNumber ? `<p style="margin:4px 0 0;font-size:14px;color:#374151;">Tracking: <strong>${trackingNumber}</strong></p>` : ""}
      </td></tr>
    </table>
    ${trackingUrl ? btn("Track Your Package &rarr;", trackingUrl, "#16a34a") : ""}
    <p style="margin:0;font-size:14px;color:#6b7280;">Sit tight — your package is on its way!</p>
  `);
}

export function orderDeliveredEmail(storeName: string, orderNumber: string, firstName: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">&#9989; Order Delivered!</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, your order <strong>#${orderNumber}</strong> has been delivered. We hope you love it!</p>
    <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.7;">If you have any issues, please contact our support team. You can also return items within the return window if needed.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">How was your experience? Leave a review on our website!</p>
  `);
}

export function orderCancelledEmail(storeName: string, orderNumber: string, firstName: string, reason?: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Order Cancelled</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, your order <strong>#${orderNumber}</strong> has been cancelled.</p>
    ${reason ? `<p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Reason: <em>${reason}</em></p>` : ""}
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">If you paid online, your refund will be processed within 5&ndash;7 business days.</p>
  `);
}

export function returnApprovedEmail(storeName: string, orderNumber: string, firstName: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">&#8617;&#65039; Return Approved</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, your return request for order <strong>#${orderNumber}</strong> has been approved.</p>
    <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.7;">We&apos;ll arrange a pickup shortly. Please keep the items ready in their original packaging.</p>
    <p style="margin:0;font-size:14px;color:#6b7280;">Your refund will be processed after we receive and inspect the items (5&ndash;7 business days).</p>
  `);
}

export function welcomeEmail(storeName: string, firstName: string) {
  return baseTemplate(storeName, `
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">&#127881; Welcome to ${storeName}!</h1>
    <p style="margin:0 0 12px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${firstName}</strong>, your account has been created successfully. We&apos;re excited to have you!</p>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">Start shopping and discover our latest products. Your first order could be just a few clicks away.</p>
  `);
}

// ── Merchant / Platform emails ────────────────────────────────────────────────

function merchantBase(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">
  <!-- Logo header -->
  <tr>
    <td style="background:#ffffff;border-radius:14px 14px 0 0;padding:24px 36px 20px;border-bottom:3px solid #ec1f78;">
      ${LOGO_ROW}
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="background:#ffffff;padding:32px 36px 28px;">
      ${content}
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;border-radius:0 0 14px 14px;padding:18px 36px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Buynoe Technologies Private Limited &middot; <a href="https://buynoe.com" style="color:#ec1f78;text-decoration:none;">buynoe.com</a></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function merchantVerificationEmail(merchantName: string, verifyUrl: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#111827;line-height:1.3;">Verify your email address</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;line-height:1.7;">
      Hi <strong style="color:#374151;">${merchantName}</strong>, welcome to Buynoe! Click the button below to verify your email and activate your account.
    </p>
    ${btn("Verify Email Address &rarr;", verifyUrl)}
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;line-height:1.6;">
      This link expires in <strong style="color:#374151;">24 hours</strong>. If you didn&apos;t sign up for Buynoe, you can safely ignore this email.
    </p>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;line-height:1.6;">
      Button not working? Copy this link into your browser:<br>
      <a href="${verifyUrl}" style="color:#ec1f78;word-break:break-all;">${verifyUrl}</a>
    </p>
  `);
}

export function merchantWelcomeEmail(merchantName: string, storeName: string, dashboardUrl: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Welcome to Buynoe, ${merchantName}! &#127881;</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Your store <strong style="color:#374151;">${storeName}</strong> is live and ready. Your 30-day free trial has started &mdash; no credit card needed.</p>
    ${btn("Go to your dashboard &rarr;", dashboardUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Questions? Reply to this email or write to <a href="mailto:support@buynoe.com" style="color:#ec1f78;">support@buynoe.com</a></p>
  `);
}

export function merchantPlanUpgradedEmail(merchantName: string, planName: string, amountRupees: number, invoiceNumber: string, nextBillingDate: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Plan upgraded successfully &#10003;</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${merchantName}</strong>, your Buynoe subscription has been upgraded.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:12px;color:#15803d;font-weight:600;">New Plan</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#111;">${planName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#374151;">&#8377;${amountRupees.toLocaleString("en-IN")}/month + GST</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Invoice: ${invoiceNumber} &middot; Next billing: ${nextBillingDate}</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">Your store now has access to all ${planName} plan features. Thank you for choosing Buynoe!</p>
  `);
}

export function merchantPaymentSuccessEmail(merchantName: string, planName: string, amountRupees: number, invoiceNumber: string, paymentId: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Payment received &#10003;</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${merchantName}</strong>, we&apos;ve received your payment for the <strong>${planName}</strong> plan.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 16px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:12px;color:#15803d;font-weight:600;">Payment Confirmed</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#111;">&#8377;${amountRupees.toLocaleString("en-IN")}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Invoice: ${invoiceNumber} &middot; Razorpay: ${paymentId}</p>
      </td></tr>
    </table>
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Keep this email as your payment confirmation. You can download your invoice from the billing page in your dashboard.</p>
  `);
}

export function merchantPaymentFailedEmail(merchantName: string, planName: string, retryUrl: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Payment failed</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${merchantName}</strong>, your payment for the <strong>${planName}</strong> plan could not be processed.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin:0 0 4px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Transaction Failed</p>
        <p style="margin:6px 0 0;font-size:13px;color:#374151;">Please check your payment method and try again. Your account remains active.</p>
      </td></tr>
    </table>
    ${btn("Retry Payment &rarr;", retryUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Need help? Contact us at <a href="mailto:support@buynoe.com" style="color:#ec1f78;">support@buynoe.com</a></p>
  `);
}

export function merchantTrialExpiringEmail(merchantName: string, daysLeft: number, upgradeUrl: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${merchantName}</strong>, your 30-day Buynoe free trial is almost over.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin:0 0 4px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#92400e;font-weight:600;">&#9200; ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining</p>
        <p style="margin:6px 0 0;font-size:13px;color:#374151;">Upgrade now to keep your store running without interruption. Your data will never be deleted.</p>
      </td></tr>
    </table>
    ${btn("Upgrade my plan &rarr;", upgradeUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Starting from just &#8377;2,999/month. Cancel anytime.</p>
  `);
}

export function merchantTrialExpiredEmail(merchantName: string, upgradeUrl: string) {
  return merchantBase(`
    <h1 style="margin:0 0 10px;font-size:22px;font-weight:800;color:#111827;">Your free trial has expired</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#6b7280;line-height:1.7;">Hi <strong style="color:#374151;">${merchantName}</strong>, your 30-day Buynoe free trial has ended. Your store is currently paused.</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;margin:0 0 4px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">Store Paused</p>
        <p style="margin:6px 0 0;font-size:13px;color:#374151;">Upgrade to a paid plan to reactivate your store immediately. All your data is safe.</p>
      </td></tr>
    </table>
    ${btn("Reactivate my store &rarr;", upgradeUrl)}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Basic from &#8377;2,999/mo &middot; Pro from &#8377;4,999/mo &middot; No setup fees</p>
  `);
}
