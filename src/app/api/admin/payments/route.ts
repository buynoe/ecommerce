import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const q      = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const plan   = searchParams.get("plan") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 20;

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q } },
      { merchant: { name: { contains: q } } },
      { merchant: { email: { contains: q } } },
    ];
  }
  if (status) where.status = status;
  if (plan)   where.plan   = plan;

  const [transactions, total, totals] = await Promise.all([
    prisma.merchantTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { merchant: { select: { name: true, email: true } } },
    }),
    prisma.merchantTransaction.count({ where }),
    prisma.merchantTransaction.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({ transactions, total, pages: Math.ceil(total / limit), page, totals });
}
