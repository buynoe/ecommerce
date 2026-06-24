import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { storeId, isDefault, ...rest } = body;
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const existing = await prisma.customerAddress.findFirst({ where: { id, customerId: customer.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isDefault) {
    await prisma.customerAddress.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
  }

  const address = await prisma.customerAddress.update({
    where: { id },
    data: { ...rest, ...(isDefault !== undefined ? { isDefault } : {}) },
  });
  return NextResponse.json({ address });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.customerAddress.findFirst({ where: { id, customerId: customer.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customerAddress.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
