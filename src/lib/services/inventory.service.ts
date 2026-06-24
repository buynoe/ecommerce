import { prisma } from "@/lib/prisma";
import type { InventoryAction } from "@/types";

export async function adjustInventory(
  variantId: string,
  quantity: number, // positive = add, negative = deduct
  action: InventoryAction,
  reason?: string,
  orderId?: string
) {
  const item = await prisma.inventoryItem.findUnique({ where: { variantId } });
  if (!item) throw new Error(`Inventory not found for variant ${variantId}`);

  const prev = item.available;
  const next = prev + quantity;

  if (next < 0 && !item.allowBackorder) {
    throw new Error(`Insufficient inventory. Available: ${prev}, Requested: ${Math.abs(quantity)}`);
  }

  const updated = await prisma.inventoryItem.update({
    where: { variantId },
    data: { available: Math.max(next, 0) },
  });

  await prisma.inventoryLog.create({
    data: { inventoryItemId: item.id, action, quantity, prevAvailable: prev, newAvailable: updated.available, reason, orderId },
  });

  return updated;
}

export async function reserveInventory(variantId: string, qty: number, orderId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { variantId } });
  if (!item) throw new Error("Inventory not found");
  if (item.available < qty && !item.allowBackorder) throw new Error("Insufficient stock");

  await prisma.inventoryItem.update({
    where: { variantId },
    data: { available: { decrement: qty }, reserved: { increment: qty } },
  });
  await prisma.inventoryLog.create({
    data: { inventoryItemId: item.id, action: "RESERVE", quantity: qty, prevAvailable: item.available, newAvailable: item.available - qty, orderId },
  });
}

export async function releaseReserved(variantId: string, qty: number, orderId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { variantId } });
  if (!item) return;
  await prisma.inventoryItem.update({
    where: { variantId },
    data: { reserved: { decrement: qty }, available: { increment: qty } },
  });
  await prisma.inventoryLog.create({
    data: { inventoryItemId: item.id, action: "UNRESERVE", quantity: qty, prevAvailable: item.available, newAvailable: item.available + qty, orderId },
  });
}

export async function confirmSale(variantId: string, qty: number, orderId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { variantId } });
  if (!item) return;
  await prisma.inventoryItem.update({
    where: { variantId },
    data: { reserved: { decrement: qty } },
  });
  await prisma.inventoryLog.create({
    data: { inventoryItemId: item.id, action: "SALE", quantity: -qty, prevAvailable: item.available, newAvailable: item.available, orderId },
  });
}

export async function restoreFromCancellation(variantId: string, qty: number, orderId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { variantId } });
  if (!item) return;
  const prev = item.available;
  await prisma.inventoryItem.update({
    where: { variantId },
    data: { available: { increment: qty } },
  });
  await prisma.inventoryLog.create({
    data: { inventoryItemId: item.id, action: "RETURN", quantity: qty, prevAvailable: prev, newAvailable: prev + qty, orderId },
  });
}

export async function getLowStockItems(storeId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { product: { storeId }, status: "ACTIVE" },
    include: { inventoryItem: true, product: { select: { title: true } } },
  });
  return variants.filter(v => v.inventoryItem && v.inventoryItem.available <= v.inventoryItem.lowStockAlert);
}
