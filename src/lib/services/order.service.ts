import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { reserveInventory, releaseReserved, restoreFromCancellation } from "./inventory.service";
import type { AddressJSON } from "@/types";

interface CreateOrderInput {
  storeId: string;
  customerId?: string;
  email: string;
  phone?: string;
  items: Array<{ variantId: string; quantity: number; price: number; compareAtPrice?: number; taxAmount?: number; discountAmount?: number }>;
  shippingAddress: AddressJSON;
  billingAddress?: AddressJSON;
  shippingMethodId?: string;
  shippingCost?: number;
  taxAmount?: number;
  taxIncluded?: boolean;
  discountAmount?: number;
  couponId?: string;
  paymentGatewayId?: string;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const orderNumber = generateOrderNumber();

  // Fetch variant/product info for snapshot
  const variantIds = input.items.map(i => i.variantId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { include: { images: { take: 1 } } }, inventoryItem: true },
  });

  // Validate stock
  for (const item of input.items) {
    const variant = variants.find(v => v.id === item.variantId);
    if (!variant) throw new Error(`Variant ${item.variantId} not found`);
    const inv = variant.inventoryItem;
    if (inv && inv.trackInventory && inv.available < item.quantity && !inv.allowBackorder) {
      throw new Error(`Insufficient stock for ${variant.product.title}`);
    }
  }

  const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
  // If tax is included in prices, don't add it again to the total
  const taxToAdd = input.taxIncluded ? 0 : (input.taxAmount || 0);
  const total = subtotal + (input.shippingCost || 0) + taxToAdd - (input.discountAmount || 0);

  const order = await prisma.order.create({
    data: {
      storeId: input.storeId,
      orderNumber,
      customerId: input.customerId,
      email: input.email,
      phone: input.phone,
      status: "PENDING_PAYMENT",
      subtotal,
      shippingCost: input.shippingCost || 0,
      taxAmount: input.taxAmount || 0,
      discountAmount: input.discountAmount || 0,
      total,
      shippingAddress: JSON.stringify(input.shippingAddress),
      billingAddress: JSON.stringify(input.billingAddress || input.shippingAddress),
      shippingMethodId: input.shippingMethodId,
      paymentGatewayId: input.paymentGatewayId,
      couponId: input.couponId,
      notes: input.notes,
      items: {
        create: input.items.map(item => {
          const variant = variants.find(v => v.id === item.variantId)!;
          return {
            productId: variant.productId,
            variantId: item.variantId,
            title: variant.product.title,
            variantTitle: variant.title,
            sku: variant.sku,
            price: item.price,
            compareAtPrice: item.compareAtPrice,
            quantity: item.quantity,
            taxAmount: item.taxAmount || 0,
            discountAmount: item.discountAmount || 0,
            total: item.price * item.quantity,
            imageUrl: variant.imageUrl || variant.product.images[0]?.url,
          };
        }),
      },
      timeline: {
        create: { status: "PENDING_PAYMENT", message: "Order created" },
      },
    },
    include: { items: true },
  });

  // Reserve inventory
  for (const item of input.items) {
    try { await reserveInventory(item.variantId, item.quantity, order.id); } catch (_e) { /* best-effort */ }
  }

  return order;
}

export async function updateOrderStatus(orderId: string, status: string, message?: string, createdBy?: string) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: { items: true },
  });

  await prisma.orderTimeline.create({
    data: { orderId, status, message: message || `Status updated to ${status}`, createdBy },
  });

  // Handle inventory side effects
  if (status === "CANCELLED") {
    for (const item of order.items) {
      try { await restoreFromCancellation(item.variantId, item.quantity, orderId); } catch (_e) { /* best-effort */ }
    }
  }

  return order;
}

export async function cancelOrder(orderId: string, reason: string, storeId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, storeId }, include: { items: true } });
  if (!order) throw new Error("Order not found");
  if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(order.status)) {
    throw new Error("Cannot cancel shipped orders");
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", cancelReason: reason },
  });

  for (const item of order.items) {
    try {
      await releaseReserved(item.variantId, item.quantity, orderId);
      await restoreFromCancellation(item.variantId, item.quantity, orderId);
    } catch (_e) { /* best-effort */ }
  }

  await prisma.orderTimeline.create({
    data: { orderId, status: "CANCELLED", message: `Cancelled: ${reason}` },
  });

  return updated;
}

export async function getOrderStats(storeId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [total, thisMonth, today, byStatus] = await Promise.all([
    prisma.order.aggregate({ where: { storeId }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { storeId, createdAt: { gte: startOfMonth } }, _sum: { total: true }, _count: true }),
    prisma.order.count({ where: { storeId, createdAt: { gte: startOfToday } } }),
    prisma.order.groupBy({ by: ["status"], where: { storeId }, _count: true }),
  ]);

  return { total, thisMonth, today, byStatus };
}
