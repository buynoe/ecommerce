import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConfigured, parseStoreCloudinary, isStoreCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const merchant = await requireMerchant();
  if (!merchant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderId = formData.get("folderId") as string | null;
  const alt = formData.get("alt") as string | null;
  const subfolder = formData.get("subfolder") as string | null; // e.g. "banners", "products"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF, AVIF allowed" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let url: string;
  let publicId: string | undefined;
  let thumbnailUrl: string | undefined;
  let width: number | undefined;
  let height: number | undefined;

  const storeConfig = parseStoreCloudinary(merchant.store?.cloudinarySettings || "{}");
  const useStoreCloud = isStoreCloudinaryConfigured(storeConfig);
  const usePlatformCloud = isConfigured();

  if (useStoreCloud || usePlatformCloud) {
    // ── Upload to Cloudinary (store-specific or platform) ─────────────────────
    try {
      // Store images go into stores/{slug}/ when using merchant's own Cloudinary
      // or buynoe/{slug}/media when using platform Cloudinary
      const baseFolder = useStoreCloud
        ? `stores/${merchant.store!.slug}`
        : `buynoe/${merchant.store!.slug}/media`;
      const folder = subfolder ? `${baseFolder}/${subfolder}` : baseFolder;
      const result = await uploadToCloudinary(buffer, folder, useStoreCloud ? storeConfig : undefined);
      url = result.url;
      publicId = result.publicId;
      width = result.width;
      height = result.height;
      thumbnailUrl = result.thumbnailUrl;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return NextResponse.json({ error: "Cloudinary upload failed. Check your API credentials." }, { status: 500 });
    }
  } else {
    // ── Fallback: local /public/uploads ───────────────────────────────────────
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(path.join(uploadsDir, filename), buffer);
      url = `/uploads/${filename}`;
      thumbnailUrl = url;
    } catch (err) {
      console.error("Local upload failed:", err);
      return NextResponse.json({ error: "Failed to save file locally." }, { status: 500 });
    }
  }

  // ── Persist to DB ─────────────────────────────────────────────────────────
  const media = await prisma.mediaFile.create({
    data: {
      storeId: merchant.store!.id,
      folderId: folderId || null,
      publicId,
      url,
      thumbnailUrl: thumbnailUrl || url,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      width,
      height,
      alt: alt || file.name.replace(/\.[^.]+$/, ""),
    },
  });

  return NextResponse.json({ media });
}
