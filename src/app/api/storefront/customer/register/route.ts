import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/sendOrderEmail";

export async function POST(req: NextRequest) {
  try {
    const { storeId, firstName, lastName, email, phone, password } = await req.json();

    if (!storeId || !firstName || !email || !password) {
      return NextResponse.json({ error: "First name, email and password are required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.customer.findUnique({ where: { storeId_email: { storeId, email } } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const customer = await prisma.customer.create({
      data: { storeId, firstName, lastName: lastName || "", email, phone: phone || null, password: hashedPassword },
    });

    const token = signCustomerToken({ customerId: customer.id, email: customer.email, storeId });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(storeId, email, firstName).catch(() => {});

    const res = NextResponse.json({ customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email } });
    res.cookies.set(`customer-token-${storeId}`, token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 3600, path: "/" });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
