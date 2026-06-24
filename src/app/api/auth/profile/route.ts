import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMerchant, hashPassword, verifyPassword } from "@/lib/auth";

export async function GET() {
  const m = await getMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const merchant = await prisma.merchant.findUnique({
    where: { id: m.id },
    select: { id: true, name: true, email: true, phone: true, emailVerified: true, createdAt: true },
  });
  return NextResponse.json({ merchant });
}

export async function PATCH(req: NextRequest) {
  const m = await getMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { name, phone, currentPassword, newPassword } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (name?.trim()) data.name = name.trim();
  if (phone !== undefined) data.phone = phone.trim() || null;

  // Password change
  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password is required to set a new password" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });

    const merchant = await prisma.merchant.findUnique({ where: { id: m.id } });
    if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const valid = await verifyPassword(currentPassword, merchant.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

    data.password = await hashPassword(newPassword);
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await prisma.merchant.update({ where: { id: m.id }, data });
  return NextResponse.json({ success: true });
}
