import { v2 as cloudinary } from "cloudinary";

/**
 * Insert Cloudinary transformation string into an existing Cloudinary URL.
 * Works on any res.cloudinary.com URL regardless of which account uploaded it.
 * Returns the original url unchanged if it is not a Cloudinary URL.
 */
export function cloudinaryTransform(url: string | null | undefined, transforms: string): string {
  if (!url) return "";
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary URL
  return url.slice(0, idx + marker.length) + transforms + "/" + url.slice(idx + marker.length);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default cloudinary;

export function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    !process.env.CLOUDINARY_CLOUD_NAME.includes("your_")
  );
}

export interface StoreCloudinaryConfig {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

export function parseStoreCloudinary(settingsJson: string): StoreCloudinaryConfig {
  try { return JSON.parse(settingsJson || "{}"); } catch { return {}; }
}

export function isStoreCloudinaryConfigured(cfg: StoreCloudinaryConfig) {
  return !!(cfg.cloudName && cfg.apiKey && cfg.apiSecret);
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  storeConfig?: StoreCloudinaryConfig
): Promise<{ url: string; publicId: string; width: number; height: number; thumbnailUrl: string }> {
  const { v2: cl } = await import("cloudinary");

  if (storeConfig && isStoreCloudinaryConfigured(storeConfig)) {
    cl.config({ cloud_name: storeConfig.cloudName, api_key: storeConfig.apiKey, api_secret: storeConfig.apiSecret, secure: true });
  } else {
    cl.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  }

  const result = await new Promise<{ secure_url: string; public_id: string; width: number; height: number }>(
    (resolve, reject) => {
      const stream = cl.uploader.upload_stream(
        { folder, resource_type: "image", transformation: [{ quality: "auto", fetch_format: "auto" }] },
        (err, res) => (err ? reject(err) : resolve(res as { secure_url: string; public_id: string; width: number; height: number }))
      );
      stream.end(buffer);
    }
  );

  const thumbnailUrl = cl.url(result.public_id, { width: 400, height: 400, crop: "fill", quality: "auto", fetch_format: "auto" });
  return { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, thumbnailUrl };
}
