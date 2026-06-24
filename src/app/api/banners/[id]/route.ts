import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const banner = await prisma.storeBanner.update({
    where: { id },
    data: {
      title: data.title,
      subtitle: data.subtitle,
      buttonText: data.buttonText,
      buttonLink: data.buttonLink,
      imageUrl: data.imageUrl,
      bgColor: data.bgColor,
      textColor: data.textColor,
      position: data.position,
      isActive: data.isActive,
    },
  });
  return NextResponse.json({ banner });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.storeBanner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
