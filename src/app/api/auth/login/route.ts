import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setMerchantCookie } from "@/lib/auth";
import { cookies } from "next/headers";

async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: "POST" }
    );
    const data = await res.json();
    if (typeof data.score === "number") return data.success && data.score >= 0.5;
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, captchaToken } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: "Please complete the CAPTCHA" }, { status: 400 });
    }
    const captchaOk = await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { store: true },
    });
    if (!merchant || !(await verifyPassword(password, merchant.password))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = signToken({ merchantId: merchant.id, email: merchant.email, storeId: merchant.store?.id });
    const cookieStore = await cookies();
    const { name, value, options } = setMerchantCookie(token);
    cookieStore.set(name, value, options);

    return NextResponse.json({ success: true, storeSlug: merchant.store?.slug });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
