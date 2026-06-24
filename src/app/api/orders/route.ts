import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = { storeId: m.store!.id };
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { customer: { firstName: { contains: search } } },
      { customer: { lastName: { contains: search } } },
    ];
  }

  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom + "T00:00:00.000Z");
    if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
    where.createdAt = createdAt;
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: {
        items: { take: 2, select: { title: true, product: { select: { title: true } } } },
        customer: { select: { firstName: true, lastName: true, email: true } },
        shipments: { take: 1, orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) });
}
