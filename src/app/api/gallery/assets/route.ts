import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

export async function GET(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") || undefined;
  const search = searchParams.get("search") || "";

  const assets = await prisma.mediaFile.findMany({
    where: {
      storeId: m.store!.id,
      ...(folderId === "null" ? { folderId: null } : folderId ? { folderId } : {}),
      ...(search ? { filename: { contains: search } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ assets });
}

export async function PATCH(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, alt, folderId } = await req.json();
  const asset = await prisma.mediaFile.update({
    where: { id, storeId: m.store!.id },
    data: {
      ...(alt !== undefined && { alt }),
      ...(folderId !== undefined && { folderId }),
    },
  });
  return NextResponse.json({ asset });
}

export async function DELETE(req: NextRequest) {
  const m = await requireMerchant();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();

  const asset = await prisma.mediaFile.findFirst({ where: { id, storeId: m.store!.id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete from Cloudinary
  if (asset.publicId) {
    try { await cloudinary.uploader.destroy(asset.publicId); } catch { /* ignore */ }
  }

  await prisma.mediaFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
