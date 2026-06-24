import { prisma } from "@/lib/prisma";

export const PROFILE_KEYS = [
  "PLATFORM_NAME", "PLATFORM_TAGLINE", "PLATFORM_ADDRESS",
  "PLATFORM_GST", "PLATFORM_CONTACT_EMAIL", "PLATFORM_CONTACT_PHONE",
  "PLATFORM_LOGO_URL", "PLATFORM_WEBSITE",
];

const EMAIL_KEYS = [
  "EMAIL_PROVIDER",
  "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM",
  "SENDGRID_API_KEY", "SENDGRID_FROM",
  "EMAIL_SIGNUP", "EMAIL_PLAN_UPGRADE", "EMAIL_PLAN_EXPIRY", "EMAIL_PAYMENT",
];

const PAYMENT_KEYS = [
  "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_ENABLED",
  "CASHFREE_APP_ID", "CASHFREE_SECRET_KEY", "CASHFREE_ENV", "CASHFREE_ENABLED",
];

export const ALL_PLATFORM_KEYS = [...PROFILE_KEYS, ...PAYMENT_KEYS, ...EMAIL_KEYS];

async function fetchSettings(keys: string[]) {
  const rows = await prisma.platformSetting.findMany({ where: { key: { in: keys } } });
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export interface SmtpConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export async function getPlatformEmail() {
  const s = await fetchSettings(EMAIL_KEYS);
  const provider: "smtp" | "sendgrid" = (s.EMAIL_PROVIDER as "smtp" | "sendgrid") || "smtp";

  let smtp: SmtpConfig;

  if (provider === "sendgrid") {
    const apiKey = s.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY || "";
    smtp = {
      host: "smtp.sendgrid.net",
      port: 587,
      user: "apikey",
      pass: apiKey,
      from: s.SENDGRID_FROM || process.env.SENDGRID_FROM || "Buynoe <noreply@buynoe.com>",
    };
  } else {
    smtp = {
      host: s.SMTP_HOST || process.env.SMTP_HOST,
      port: parseInt(s.SMTP_PORT || process.env.SMTP_PORT || "587"),
      user: s.SMTP_USER || process.env.SMTP_USER,
      pass: s.SMTP_PASS || process.env.SMTP_PASS,
      from: s.SMTP_FROM || process.env.SMTP_FROM,
    };
  }

  return {
    provider,
    smtp,
    emailSignup: s.EMAIL_SIGNUP !== "false",
    emailPlanUpgrade: s.EMAIL_PLAN_UPGRADE !== "false",
    emailPlanExpiry: s.EMAIL_PLAN_EXPIRY !== "false",
    emailPayment: s.EMAIL_PAYMENT !== "false",
  };
}

export async function getPlatformRazorpay() {
  const s = await fetchSettings(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_ENABLED"]);
  return {
    keyId: s.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
    keySecret: s.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || "",
    enabled: s.RAZORPAY_ENABLED !== "false",
  };
}

export async function getPlatformCashfree() {
  const s = await fetchSettings(["CASHFREE_APP_ID", "CASHFREE_SECRET_KEY", "CASHFREE_ENV", "CASHFREE_ENABLED"]);
  return {
    appId: s.CASHFREE_APP_ID || process.env.CASHFREE_APP_ID || "",
    secretKey: s.CASHFREE_SECRET_KEY || process.env.CASHFREE_SECRET_KEY || "",
    env: (s.CASHFREE_ENV || process.env.CASHFREE_ENV || "sandbox") as "sandbox" | "production",
    enabled: s.CASHFREE_ENABLED === "true",
  };
}
