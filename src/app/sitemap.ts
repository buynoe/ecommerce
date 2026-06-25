import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://ecomm.buynoe.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await prisma.store.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  const storeUrls: MetadataRoute.Sitemap = stores.map(s => ({
    url: `${BASE}/store/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: BASE,                  lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/register`,    lastModified: new Date(), changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE}/login`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE}/terms`,       lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    { url: `${BASE}/privacy`,     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.2 },
    ...storeUrls,
  ];
}
