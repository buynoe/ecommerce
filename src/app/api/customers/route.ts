import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = { storeId: m.store!.id };
  if (search) where.OR = [
    { email: { contains: search } },
    { firstName: { contains: search } },
    { lastName: { contains: search } },
  ];

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where, skip: (page - 1) * limit, take: limit,
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where }),
  ]);
  return NextResponse.json({ customers, total, page, pages: Math.ceil(total / limit) });
}
