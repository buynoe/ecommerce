import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setMerchantCookie } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendEmail, merchantVerificationEmail } from "@/lib/email";
import { getPlatformEmail } from "@/lib/platform";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const INDIAN_PHONE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: "POST" }
    );
    const data = await res.json();
    // v3 returns a score (0.0–1.0); treat ≥ 0.5 as human
    if (typeof data.score === "number") return data.success && data.score >= 0.5;
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, confirmPassword, storeName, captchaToken, agreeTerms } = await req.json();

    // Required field checks
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password || !storeName?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!agreeTerms) {
      return NextResponse.json({ error: "You must agree to the Terms and Conditions" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (!INDIAN_PHONE.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    // reCAPTCHA
    if (!captchaToken) {
      return NextResponse.json({ error: "Please complete the CAPTCHA" }, { status: 400 });
    }
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    // Duplicate check
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    let slug = slugify(storeName);
    while (await prisma.store.findUnique({ where: { slug } })) {
      slug = `${slug}-${Math.floor(Math.random() * 1000)}`;
    }

    const emailVerifyToken = randomUUID();
    const emailVerifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const merchant = await prisma.merchant.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: hashed,
        emailVerified: false,
        emailVerifyToken,
        emailVerifyExpiry,
        plan: "TRIAL",
        trialEndsAt: new Date(Date.now() + 30 * 86400000),
        store: {
          create: {
            name: storeName.trim(),
            slug,
            email: email.trim().toLowerCase(),
            currency: "INR",
            timezone: "Asia/Kolkata",
            shippingMethods: {
              create: [
                { name: "Standard Shipping", type: "STANDARD", price: 60, minDays: 5, maxDays: 7 },
                { name: "Express Shipping",  type: "EXPRESS",  price: 150, minDays: 2, maxDays: 3 },
              ],
            },
            taxProfiles: {
              create: [
                { name: "GST 0%",  rate: 0,  type: "GST" },
                { name: "GST 5%",  rate: 5,  type: "GST" },
                { name: "GST 12%", rate: 12, type: "GST" },
                { name: "GST 18%", rate: 18, type: "GST" },
                { name: "GST 28%", rate: 28, type: "GST" },
              ],
            },
            paymentGateways: {
              create: [
                { provider: "RAZORPAY", name: "Razorpay",           config: "{}", isActive: false },
                { provider: "CASHFREE", name: "Cashfree",           config: "{}", isActive: false },
                { provider: "COD",      name: "Cash on Delivery",   config: "{}", isActive: true, supportsCOD: true },
              ],
            },
          },
        },
      },
      include: { store: true },
    });

    // Send verification email (best-effort — don't fail registration if SMTP not configured)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${emailVerifyToken}`;
    const { smtp } = await getPlatformEmail();
    await sendEmail({
      to: merchant.email,
      subject: "Verify your Buynoe email address",
      html: merchantVerificationEmail(merchant.name, verifyUrl),
    }, smtp);

    // Set auth cookie so user is logged in
    const token = signToken({ merchantId: merchant.id, email: merchant.email, storeId: merchant.store!.id });
    const cookieStore = await cookies();
    const { name: cn, value, options } = setMerchantCookie(token);
    cookieStore.set(cn, value, options);

    return NextResponse.json({ success: true, storeSlug: merchant.store!.slug, emailSent: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
