import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();

  if (data.isDefault) {
    await prisma.courierAccount.updateMany({ where: { storeId: m.store!.id }, data: { isDefault: false } });
  }

  // Don't overwrite secrets if masked placeholder sent
  const updateData: Record<string, unknown> = {
    name: data.name,
    isActive: data.isActive,
    isDefault: data.isDefault,
    warehousePincode: data.warehousePincode,
    channelId: data.channelId,
  };
  if (data.apiKey) updateData.apiKey = data.apiKey;
  if (data.apiSecret && !data.apiSecret.startsWith("•")) updateData.apiSecret = data.apiSecret;
  if (data.password && !data.password.startsWith("•")) updateData.password = data.password;
  if (data.username) updateData.username = data.username;
  if (data.clientId) updateData.clientId = data.clientId;

  const account = await prisma.courierAccount.update({ where: { id }, data: updateData });
  return NextResponse.json({ account });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.courierAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
