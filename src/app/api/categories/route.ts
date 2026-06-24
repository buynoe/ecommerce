import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { storeId: m.store!.id },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description, imageUrl } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Ensure unique slug
  const existing = await prisma.category.findUnique({ where: { storeId_slug: { storeId: m.store!.id, slug } } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const category = await prisma.category.create({
    data: { storeId: m.store!.id, name: name.trim(), slug: finalSlug, description, imageUrl },
  });

  return NextResponse.json({ category }, { status: 201 });
}
