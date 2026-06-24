import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(_req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folders = await prisma.mediaFolder.findMany({
    where: { storeId: m.store!.id },
    include: { _count: { select: { files: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, parentId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Folder name required" }, { status: 400 });

  let slug = slugify(name);
  const exists = await prisma.mediaFolder.findUnique({ where: { storeId_slug: { storeId: m.store!.id, slug } } });
  if (exists) slug = `${slug}-${Date.now()}`;

  const folder = await prisma.mediaFolder.create({
    data: { storeId: m.store!.id, name: name.trim(), slug, parentId: parentId || null },
  });
  return NextResponse.json({ folder }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.mediaFolder.delete({ where: { id, storeId: m.store!.id } });
  return NextResponse.json({ success: true });
}
