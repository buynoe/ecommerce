import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PROFILE_KEYS = [
  "PLATFORM_NAME", "PLATFORM_TAGLINE", "PLATFORM_ADDRESS",
  "PLATFORM_GST", "PLATFORM_CONTACT_EMAIL", "PLATFORM_CONTACT_PHONE",
  "PLATFORM_LOGO_URL", "PLATFORM_WEBSITE",
];

export async function GET() {
  const rows = await prisma.platformSetting.findMany({ where: { key: { in: PROFILE_KEYS } } });
  const s: Record<string, string> = {};
  for (const r of rows) s[r.key] = r.value;

  return NextResponse.json({
    name: s.PLATFORM_NAME || "Buynoe",
    tagline: s.PLATFORM_TAGLINE || "SaaS Ecommerce Platform",
    address: s.PLATFORM_ADDRESS || "",
    gst: s.PLATFORM_GST || "",
    contactEmail: s.PLATFORM_CONTACT_EMAIL || "support@buynoe.com",
    contactPhone: s.PLATFORM_CONTACT_PHONE || "",
    logoUrl: s.PLATFORM_LOGO_URL || "",
    website: s.PLATFORM_WEBSITE || "https://buynoe.com",
  });
}
