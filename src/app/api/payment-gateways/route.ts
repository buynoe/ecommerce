import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Canonical gateway definitions — always show these even before DB rows exist
const GATEWAY_DEFAULTS = [
  { provider: "RAZORPAY", name: "Razorpay", description: "Accept UPI, Cards, Net Banking & Wallets — India's #1 payment gateway", icon: "💳" },
  { provider: "CASHFREE", name: "Cashfree", description: "All Indian payment methods — UPI, Cards, Net Banking, EMI & more", icon: "🏦" },
  { provider: "COD", name: "Cash on Delivery", description: "Let customers pay at the time of delivery", icon: "💵" },
];

// GET — list all gateways for this store (merge DB rows with defaults)
export async function GET() {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const storeId = m.store!.id;

  const dbRows = await prisma.paymentGateway.findMany({ where: { storeId } });
  const rowMap = Object.fromEntries(dbRows.map((r) => [r.provider, r]));

  const gateways = GATEWAY_DEFAULTS.map((def) => {
    const row = rowMap[def.provider];
    let config: Record<string, string> = {};
    try { config = JSON.parse(row?.config || "{}"); } catch { /* ignore */ }
    return {
      id: row?.id ?? null,
      provider: def.provider,
      name: def.name,
      description: def.description,
      icon: def.icon,
      isActive: row?.isActive ?? false,
      keyId: config.keyId ?? "",
      keySecret: config.keySecret ?? "",
    };
  });

  return NextResponse.json({ gateways });
}

// POST — upsert a gateway (create or update config + isActive)
export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const storeId = m.store!.id;

  const body = await req.json();
  const { provider, isActive, keyId, keySecret } = body;

  if (!provider) return NextResponse.json({ error: "provider is required" }, { status: 400 });

  const def = GATEWAY_DEFAULTS.find((d) => d.provider === provider);
  if (!def) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  // Require keys for gateways that need them
  if (provider !== "COD" && isActive) {
    if (!keyId?.trim()) return NextResponse.json({ error: `${def.name} API Key is required` }, { status: 400 });
    if (!keySecret?.trim()) return NextResponse.json({ error: `${def.name} Secret Key is required` }, { status: 400 });
  }

  // Get the current config so we don't wipe keys when just toggling
  const existing = await prisma.paymentGateway.findUnique({
    where: { storeId_provider: { storeId, provider } },
  });
  let currentConfig: Record<string, string> = {};
  try { currentConfig = JSON.parse(existing?.config || "{}"); } catch { /* ignore */ }

  const newConfig = {
    ...currentConfig,
    ...(keyId !== undefined ? { keyId: keyId.trim() } : {}),
    ...(keySecret !== undefined ? { keySecret: keySecret.trim() } : {}),
  };

  const gateway = await prisma.paymentGateway.upsert({
    where: { storeId_provider: { storeId, provider } },
    create: {
      storeId,
      provider,
      name: def.name,
      config: JSON.stringify(newConfig),
      isActive: isActive ?? false,
      supportsCOD: provider === "COD",
    },
    update: {
      config: JSON.stringify(newConfig),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  let config: Record<string, string> = {};
  try { config = JSON.parse(gateway.config); } catch { /* ignore */ }

  return NextResponse.json({
    gateway: {
      id: gateway.id,
      provider: gateway.provider,
      name: gateway.name,
      isActive: gateway.isActive,
      keyId: config.keyId ?? "",
      keySecret: config.keySecret ?? "",
    },
  });
}
