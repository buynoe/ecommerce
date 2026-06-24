import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalMerchants,
    newThisMonth,
    newLastMonth,
    trialMerchants,
    basicMerchants,
    proMerchants,
    enterpriseMerchants,
    verifiedMerchants,
    revenueThis,
    revenueLast,
    revenueTotal,
    recentMerchants,
    recentTx,
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.merchant.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    prisma.merchant.count({ where: { plan: "TRIAL" } }),
    prisma.merchant.count({ where: { plan: "BASIC" } }),
    prisma.merchant.count({ where: { plan: "PRO" } }),
    prisma.merchant.count({ where: { plan: "ENTERPRISE" } }),
    prisma.merchant.count({ where: { emailVerified: true } }),
    prisma.merchantTransaction.aggregate({ where: { status: "SUCCESS", createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.merchantTransaction.aggregate({ where: { status: "SUCCESS", createdAt: { gte: startOfLastMonth, lt: startOfMonth } }, _sum: { amount: true } }),
    prisma.merchantTransaction.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    prisma.merchant.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { store: { select: { name: true, slug: true } } } }),
    prisma.merchantTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { merchant: { select: { name: true, email: true } } } }),
  ]);

  return NextResponse.json({
    totalMerchants,
    newThisMonth,
    newLastMonth,
    planBreakdown: { TRIAL: trialMerchants, BASIC: basicMerchants, PRO: proMerchants, ENTERPRISE: enterpriseMerchants },
    verifiedMerchants,
    revenue: {
      total: revenueTotal._sum.amount ?? 0,
      thisMonth: revenueThis._sum.amount ?? 0,
      lastMonth: revenueLast._sum.amount ?? 0,
    },
    recentMerchants,
    recentTx,
  });
}
