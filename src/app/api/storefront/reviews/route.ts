import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: fetch approved reviews for a product
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const storeId = searchParams.get("storeId");
  if (!productId || !storeId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    const reviews = await prisma.review.findMany({
      where: { productId, storeId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, rating: true, title: true, body: true,
        verified: true, createdAt: true,
      },
    });

    const avg = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    return NextResponse.json({ reviews, avg: parseFloat(avg.toFixed(1)), count: reviews.length });
  } catch (err) {
    console.error("[GET /api/storefront/reviews] error:", err);
    // Return empty gracefully so the product page still loads
    return NextResponse.json({ reviews: [], avg: 0, count: 0 });
  }
}

// POST: customer submits a review
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { storeId, productId, name, email, rating, title, body: reviewBody } = payload;

    if (!storeId || !productId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    // Get store settings
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
    if (!store.reviewsEnabled) return NextResponse.json({ error: "Reviews are disabled for this store" }, { status: 403 });

    // Check if logged-in customer; mark verified purchase if they bought the product
    const customer = await getCustomerFromCookie(storeId);
    let verified = false;
    if (customer) {
      const purchase = await prisma.orderItem.findFirst({
        where: {
          productId,
          order: { customerId: customer.id, storeId, status: "DELIVERED" },
        },
      });
      verified = !!purchase;
    }

    const status = store.reviewsRequireApproval ? "PENDING" : "APPROVED";

    const review = await prisma.review.create({
      data: {
        storeId,
        productId,
        customerId: customer?.id || null,
        name: name.trim(),
        email: email?.trim() || null,
        rating: parseInt(rating),
        title: title?.trim() || null,
        body: reviewBody?.trim() || null,
        status,
        verified,
      },
    });

    return NextResponse.json(
      {
        review,
        message:
          status === "PENDING"
            ? "Your review has been submitted and is awaiting approval."
            : "Your review has been published!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/storefront/reviews] error:", err);
    return NextResponse.json({ error: "Failed to submit review. Please try again." }, { status: 500 });
  }
}
