import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ count: 0 });

  const count = await prisma.merchantNotification.count({
    where: { storeId: m.store!.id, read: false },
  });

  return NextResponse.json({ count });
}
