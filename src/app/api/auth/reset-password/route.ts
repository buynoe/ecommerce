import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();
  if (!token || !password) return NextResponse.json({ error: "Token and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const merchant = await prisma.merchant.findFirst({
    where: { passwordResetToken: token, passwordResetExpiry: { gt: new Date() } },
  });

  if (!merchant) return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { password: await hashPassword(password), passwordResetToken: null, passwordResetExpiry: null },
  });

  return NextResponse.json({ success: true });
}
