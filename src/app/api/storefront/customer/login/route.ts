import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signCustomerToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { storeId, email, password } = await req.json();
    if (!storeId || !email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { storeId_email: { storeId, email } } });
    if (!customer?.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const token = signCustomerToken({ customerId: customer.id, email: customer.email, storeId });
    const res = NextResponse.json({ customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email } });
    res.cookies.set(`customer-token-${storeId}`, token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 3600, path: "/" });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId") || "";
  const res = NextResponse.json({ success: true });
  res.cookies.delete(`customer-token-${storeId}`);
  return res;
}
