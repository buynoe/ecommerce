import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const banners = await prisma.storeBanner.findMany({
    where: { storeId: m.store!.id },
    orderBy: { position: "asc" },
  });
  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await req.json();
  const banner = await prisma.storeBanner.create({
    data: {
      storeId: m.store!.id,
      title: data.title || "Welcome",
      subtitle: data.subtitle,
      buttonText: data.buttonText,
      buttonLink: data.buttonLink,
      imageUrl: data.imageUrl,
      bgColor: data.bgColor || "#1f2937",
      textColor: data.textColor || "#ffffff",
      position: data.position ?? 0,
      isActive: data.isActive ?? true,
    },
  });
  return NextResponse.json({ banner });
}
