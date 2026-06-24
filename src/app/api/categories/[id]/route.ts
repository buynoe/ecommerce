import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const { name, description, imageUrl, isActive } = body;

  const updated = await prisma.category.update({
    where: { id },
    data: { name, description, imageUrl, isActive },
  });

  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Remove product links first
  await prisma.productCategory.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
