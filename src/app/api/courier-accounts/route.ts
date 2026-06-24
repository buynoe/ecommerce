import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accounts = await prisma.courierAccount.findMany({
    where: { storeId: m.store!.id },
    orderBy: { createdAt: "asc" },
  });
  // Mask secrets for display
  const masked = accounts.map(a => ({
    ...a,
    apiSecret: a.apiSecret ? "•".repeat(8) : null,
    password: a.password ? "•".repeat(8) : null,
  }));
  return NextResponse.json({ accounts: masked });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();

  // If marking as default, unset others
  if (data.isDefault) {
    await prisma.courierAccount.updateMany({
      where: { storeId: m.store!.id },
      data: { isDefault: false },
    });
  }

  const account = await prisma.courierAccount.create({
    data: {
      storeId: m.store!.id,
      provider: data.provider,
      name: data.name || data.provider,
      apiKey: data.apiKey || null,
      apiSecret: data.apiSecret || null,
      clientId: data.clientId || null,
      username: data.username || null,
      password: data.password || null,
      channelId: data.channelId || null,
      warehousePincode: data.warehousePincode || null,
      isActive: true,
      isDefault: data.isDefault ?? false,
    },
  });
  return NextResponse.json({ account: { ...account, apiSecret: account.apiSecret ? "•••••••" : null, password: account.password ? "•••••••" : null } });
}
