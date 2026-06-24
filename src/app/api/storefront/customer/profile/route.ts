import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { storeId, firstName, lastName, phone, currentPassword, newPassword } = body;

  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // If changing password, verify current password
  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password is required to change password" }, { status: 400 });
    const full = await prisma.customer.findUnique({ where: { id: customer.id } });
    if (!full?.password) return NextResponse.json({ error: "No password set on this account" }, { status: 400 });
    const valid = await bcrypt.compare(currentPassword, full.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const updateData: Record<string, string | undefined> = { firstName, lastName, phone: phone || undefined };
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: updateData,
  });

  return NextResponse.json({
    customer: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
    },
  });
}
