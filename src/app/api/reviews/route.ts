import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = { storeId: m.store!.id, ...(status ? { status } : {}) };

  try {
    // Fetch reviews without nested includes (LibSQL limitation: nested select on relations can crash)
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    // Fetch related product and customer data separately to avoid LibSQL nested include crash
    const productIds = [...new Set(reviews.map((r) => r.productId))];
    const customerIds = [...new Set(reviews.map((r) => r.customerId).filter(Boolean))] as string[];

    const [products, customers] = await Promise.all([
      productIds.length
        ? prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, title: true, handle: true },
          })
        : Promise.resolve([]),
      customerIds.length
        ? prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : Promise.resolve([]),
    ]);

    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

    const enriched = reviews.map((r) => ({
      ...r,
      product: productMap[r.productId] ?? null,
      customer: r.customerId ? (customerMap[r.customerId] ?? null) : null,
    }));

    return NextResponse.json({ reviews: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[GET /api/reviews] error:", err);
    return NextResponse.json({ reviews: [], total: 0, page: 1, pages: 1, error: "Failed to load reviews" }, { status: 500 });
  }
}
