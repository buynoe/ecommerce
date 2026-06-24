import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "ORDER_NEW"
  | "ORDER_PAID"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_RETURNED"
  | "REVIEW_NEW"
  | "LOW_STOCK";

export async function createNotification(
  storeId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
) {
  try {
    await prisma.merchantNotification.create({
      data: { storeId, type, title, message, link: link ?? null },
    });
  } catch {
    // Notifications are non-critical; never let a failure bubble up
  }
}
