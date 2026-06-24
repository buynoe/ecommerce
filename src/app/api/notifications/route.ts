import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [notifications, total, unread] = await Promise.all([
    prisma.merchantNotification.findMany({
      where: { storeId: m.store!.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.merchantNotification.count({ where: { storeId: m.store!.id } }),
    prisma.merchantNotification.count({ where: { storeId: m.store!.id, read: false } }),
  ]);

  return NextResponse.json({ notifications, total, unread, page, pages: Math.ceil(total / limit) });
}

// PATCH /api/notifications  — mark all or specific notifications as read
export async function PATCH(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = body.ids; // optional: specific ids; omit = mark all

  if (ids?.length) {
    await prisma.merchantNotification.updateMany({
      where: { storeId: m.store!.id, id: { in: ids } },
      data: { read: true },
    });
  } else {
    await prisma.merchantNotification.updateMany({
      where: { storeId: m.store!.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
