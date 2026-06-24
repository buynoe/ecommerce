export type Plan = "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
export type OrderStatus =
  | "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "PROCESSING"
  | "PACKED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED"
  | "CANCELLED" | "REFUNDED" | "RETURNED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type ShipmentStatus =
  | "PENDING" | "BOOKED" | "PICKED_UP" | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED";
export type InventoryAction = "SALE" | "RETURN" | "ADJUSTMENT" | "RECEIVE" | "RESERVE" | "UNRESERVE";

export interface AddressJSON {
  firstName: string; lastName: string; company?: string;
  address1: string; address2?: string; city: string;
  state: string; pincode: string; country: string; phone?: string;
}

export interface CartItemWithDetails {
  id: string; quantity: number; savedForLater: boolean;
  variant: { id: string; title: string; price: number; compareAtPrice?: number | null;
    options: Record<string, string>; imageUrl?: string | null;
    inventoryItem?: { available: number } | null;
    product: { id: string; title: string; handle: string; storeId: string;
      images: { url: string; alt?: string | null }[] } };
}

export const PLAN_LIMITS: Record<Plan, { products: number; orders: number; staff: number }> = {
  TRIAL:      { products: 10,   orders: 50,    staff: 1 },
  BASIC:      { products: 50,   orders: 500,   staff: 2 },
  PRO:        { products: 500,  orders: 5000,  staff: 5 },
  ENTERPRISE: { products: -1,   orders: -1,    staff: -1 },
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", PENDING_PAYMENT: "Pending Payment", PAID: "Paid",
  CONFIRMED: "Confirmed", PROCESSING: "Processing", PACKED: "Packed",
  SHIPPED: "Shipped", OUT_FOR_DELIVERY: "Out for Delivery", DELIVERED: "Delivered",
  CANCELLED: "Cancelled", REFUNDED: "Refunded", RETURNED: "Returned",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_PAYMENT: "bg-yellow-100 text-yellow-700",
  PAID: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-indigo-100 text-indigo-700",
  PACKED: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-violet-100 text-violet-700",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-pink-100 text-pink-700",
  RETURNED: "bg-rose-100 text-rose-700",
};
