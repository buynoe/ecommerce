import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q") ?? "";
  const plan   = searchParams.get("plan") ?? "";
  const status = searchParams.get("status") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 20;

  const where: Record<string, unknown> = {};
  if (q) where.OR = [{ name: { contains: q } }, { email: { contains: q } }];
  if (plan)   where.plan = plan;
  if (status === "SUSPENDED") where.planStatus = "SUSPENDED";
  if (status === "ACTIVE")    where.planStatus = "ACTIVE";

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { store: { select: { name: true, slug: true, _count: { select: { orders: true, products: true, customers: true } } } } },
    }),
    prisma.merchant.count({ where }),
  ]);

  return NextResponse.json({ merchants, total, pages: Math.ceil(total / limit), page });
}
