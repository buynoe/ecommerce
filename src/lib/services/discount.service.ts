import { prisma } from "@/lib/prisma";

export async function applyCoupon(storeId: string, code: string, subtotal: number, customerId?: string) {
  const coupon = await prisma.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
  if (!coupon) throw new Error("Invalid coupon code");
  if (!coupon.isActive) throw new Error("Coupon is not active");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new Error("Coupon not yet active");
  if (coupon.endsAt && coupon.endsAt < now) throw new Error("Coupon has expired");
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error("Coupon usage limit reached");
  if (coupon.minAmount && subtotal < coupon.minAmount) throw new Error(`Minimum order amount ₹${coupon.minAmount} required`);

  if (customerId && coupon.maxUsesPerCustomer) {
    const uses = await prisma.couponUse.count({ where: { couponId: coupon.id, customerId } });
    if (uses >= coupon.maxUsesPerCustomer) throw new Error("You have already used this coupon");
  }

  let discount = 0;
  if (coupon.type === "PERCENTAGE") discount = (subtotal * coupon.value) / 100;
  else if (coupon.type === "FLAT") discount = coupon.value;
  else if (coupon.type === "FREE_SHIPPING") discount = 0; // handled separately
  else if (coupon.type === "FIRST_ORDER") {
    if (customerId) {
      const orderCount = await prisma.order.count({ where: { customerId, status: { not: "CANCELLED" } } });
      if (orderCount > 0) throw new Error("This coupon is for first-time orders only");
    }
    // FIRST_ORDER coupons store whether flat or % in the value field; treat as percentage if < 100 else flat
    discount = coupon.value < 100 ? (subtotal * coupon.value) / 100 : coupon.value;
  }

  return { coupon, discount: Math.min(discount, subtotal), isFreeShipping: coupon.type === "FREE_SHIPPING" };
}

export async function getActiveDiscounts(storeId: string) {
  const now = new Date();
  return prisma.discount.findMany({
    where: { storeId, isActive: true, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    orderBy: { createdAt: "desc" },
  });
}
