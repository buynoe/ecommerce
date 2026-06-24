import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SE-${ts}-${rand}`;
}

export function generateHandle(title: string) {
  return slugify(title);
}

export function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

export function parseJSON<T>(str: string, fallback: T): T {
  try { return JSON.parse(str); } catch { return fallback; }
}

export const SHIPPING_PROVIDERS = [
  { id: "SHIPROCKET",   name: "Shiprocket",   trackingUrl: "https://app.shiprocket.in/tracking/" },
  { id: "DELHIVERY",    name: "Delhivery",    trackingUrl: "https://www.delhivery.com/track/package/" },
  { id: "DTDC",         name: "DTDC",         trackingUrl: "https://www.dtdc.in/tracking.asp?awbno=" },
  { id: "BLUEDART",     name: "Blue Dart",    trackingUrl: "https://www.bluedart.com/tracking?trackfor=" },
  { id: "ECOM_EXPRESS", name: "Ecom Express", trackingUrl: "https://ecomexpress.in/tracking/?awb_field=" },
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const PLAN_DETAILS = {
  TRIAL:      { label: "Trial",      price: 0,     color: "gray" },
  BASIC:      { label: "Basic",      price: 2900,  color: "blue" },
  PRO:        { label: "Pro",        price: 7900,  color: "green" },
  ENTERPRISE: { label: "Enterprise", price: 29900, color: "purple" },
};
