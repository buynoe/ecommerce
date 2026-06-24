import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const PAGE_SIZE = 20;

  const where = {
    order: { storeId: m.store!.id },
    ...(status ? { status } : {}),
  };

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true, email: true, total: true, status: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
        items: {
          include: {
            orderItem: { select: { title: true, quantity: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.return.count({ where }),
  ]);

  return NextResponse.json({ returns, total, page, pageSize: PAGE_SIZE });
}
