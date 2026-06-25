/**
 * Pure URL-string helper — no Node.js SDK, safe to import anywhere (server or client).
 * Inserts Cloudinary transformation params into an existing Cloudinary delivery URL.
 */
export function cloudinaryTransform(url: string | null | undefined, transforms: string): string {
  if (!url) return "";
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary URL — return as-is
  return url.slice(0, idx + marker.length) + transforms + "/" + url.slice(idx + marker.length);
}
