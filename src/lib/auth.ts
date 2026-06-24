import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "shopease-saas-secret-2024";

export async function hashPassword(p: string) { return bcrypt.hash(p, 12); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }

export function signToken(payload: { merchantId: string; email: string; storeId?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
export function verifyToken(token: string) {
  try { return jwt.verify(token, JWT_SECRET) as { merchantId: string; email: string; storeId?: string }; }
  catch { return null; }
}

export function signCustomerToken(payload: { customerId: string; email: string; storeId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}
export function verifyCustomerToken(token: string) {
  try { return jwt.verify(token, JWT_SECRET) as { customerId: string; email: string; storeId: string }; }
  catch { return null; }
}

export async function getMerchant() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("merchant-token")?.value;
    if (!token) return null;
    const payload = verifyToken(token);
    if (!payload) return null;
    return await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
      include: { store: true },
    });
  } catch { return null; }
}

export async function requireMerchant() {
  const merchant = await getMerchant();
  if (!merchant?.store) return null;
  return merchant;
}

export async function getCustomerFromCookie(storeId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(`customer-token-${storeId}`)?.value;
    if (!token) return null;
    const payload = verifyCustomerToken(token);
    if (!payload || payload.storeId !== storeId) return null;
    return await prisma.customer.findUnique({ where: { id: payload.customerId } });
  } catch { return null; }
}

export function setMerchantCookie(token: string) {
  return { name: "merchant-token", value: token, options: { httpOnly: true, sameSite: "lax" as const, maxAge: 604800, path: "/" } };
}

// ── Admin auth ────────────────────────────────────────────────────────────────

export function signAdminToken(payload: { adminId: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
export function verifyAdminToken(token: string) {
  try { return jwt.verify(token, JWT_SECRET) as { adminId: string; email: string }; }
  catch { return null; }
}
export function setAdminCookie(token: string) {
  return { name: "admin-token", value: token, options: { httpOnly: true, sameSite: "lax" as const, maxAge: 86400, path: "/" } };
}
export async function getAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;
    if (!token) return null;
    const payload = verifyAdminToken(token);
    if (!payload) return null;
    return await prisma.admin.findUnique({ where: { id: payload.adminId } });
  } catch { return null; }
}
