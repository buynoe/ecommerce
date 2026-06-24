import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const storeId = m.store!.id;
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let since: Date;
  let until: Date;
  let chartDays: number;

  if (fromParam && toParam) {
    since = new Date(fromParam + "T00:00:00.000Z");
    until = new Date(toParam + "T23:59:59.999Z");
    chartDays = Math.ceil((until.getTime() - since.getTime()) / 86400000) + 1;
  } else {
    since = new Date(Date.now() - days * 86400000);
    until = new Date();
    chartDays = days;
  }

  const periodWhere = { storeId, createdAt: { gte: since, lte: until }, status: { not: "CANCELLED" } };

  const [orders, allOrders, totalCustomers, totalProducts, lowStock, topProducts, recentOrders] = await Promise.all([
    // Period orders (non-cancelled)
    prisma.order.findMany({
      where: periodWhere,
      select: { total: true, createdAt: true, status: true },
    }),
    // All-time non-cancelled for status breakdown
    prisma.order.findMany({
      where: { storeId, status: { not: "CANCELLED" } },
      select: { status: true, total: true },
    }),
    prisma.customer.count({ where: { storeId } }),
    prisma.product.count({ where: { storeId, status: "ACTIVE" } }),
    prisma.inventoryItem.findMany({
      where: { variant: { product: { storeId } }, available: { lte: 5 } },
      include: { variant: { include: { product: { select: { title: true } } } } },
      orderBy: { available: "asc" },
      take: 8,
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: periodWhere },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
    prisma.order.findMany({
      where: { storeId },
      include: {
        items: { take: 1, include: { product: { select: { title: true } } } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Revenue by day chart
  const revenueByDay: Record<string, number> = {};
  const ordersByDay: Record<string, number> = {};
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date(since.getTime() + (chartDays - 1 - i) * 86400000);
    const key = d.toISOString().split("T")[0];
    revenueByDay[key] = 0;
    ordersByDay[key] = 0;
  }
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().split("T")[0];
    if (revenueByDay[key] !== undefined) {
      revenueByDay[key] += o.total;
      ordersByDay[key] = (ordersByDay[key] || 0) + 1;
    }
  }

  // Revenue by status
  const revenueByStatus: Record<string, number> = {};
  for (const o of allOrders) {
    revenueByStatus[o.status] = (revenueByStatus[o.status] || 0) + o.total;
  }

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;

  // Fetch product titles for top products
  const topProductsWithTitle = await Promise.all(
    topProducts.map(async (tp) => {
      const product = await prisma.product.findUnique({
        where: { id: tp.productId },
        select: { id: true, title: true, images: { where: { isFeatured: true }, take: 1 } },
      });
      return { ...tp, product };
    })
  );

  const salesChart = Object.entries(revenueByDay).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    revenue: Math.round(revenue * 100) / 100,
    orders: ordersByDay[date] || 0,
  }));

  return NextResponse.json({
    stats: { totalRevenue, totalOrders, totalCustomers, totalProducts },
    salesChart,
    lowStock,
    topProducts: topProductsWithTitle,
    recentOrders,
    revenueByStatus,
  });
}
