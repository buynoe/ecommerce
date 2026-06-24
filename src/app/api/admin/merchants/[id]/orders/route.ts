import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: { store: { select: { id: true } } },
  });
  if (!merchant?.store) return NextResponse.json({ orders: [], total: 0, pages: 0 });

  const { searchParams } = req.nextUrl;
  const q         = searchParams.get("q") ?? "";
  const status    = searchParams.get("status") ?? "";
  const dateFrom  = searchParams.get("dateFrom") ?? "";
  const dateTo    = searchParams.get("dateTo") ?? "";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit     = 25;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { storeId: merchant.store.id };

  if (q) {
    where.OR = [
      { orderNumber: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { customer: { firstName: { contains: q } } },
      { customer: { lastName: { contains: q } } },
      { payments: { some: { gatewayPaymentId: { contains: q } } } },
    ];
  }
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { title: true } },
            variant: { select: { title: true, sku: true } },
          },
        },
        payments: { select: { id: true, gatewayPaymentId: true, method: true, status: true, amount: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, pages: Math.ceil(total / limit), page });
}
