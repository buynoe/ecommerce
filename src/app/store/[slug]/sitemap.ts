import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = "https://ecomm.buynoe.com";

export default async function sitemap({ params }: { params: Promise<{ slug: string }> }): Promise<MetadataRoute.Sitemap> {
  const { slug } = await params;

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, updatedAt: true } });
  if (!store) return [];

  const [products, collections] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, status: "ACTIVE" },
      select: { handle: true, updatedAt: true },
    }),
    prisma.collection.findMany({
      where: { storeId: store.id, status: "ACTIVE" },
      select: { handle: true, updatedAt: true },
    }),
  ]);

  return [
    {
      url: `${BASE}/store/${slug}`,
      lastModified: store.updatedAt,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...collections.map(c => ({
      url: `${BASE}/store/${slug}/collections/${c.handle}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map(p => ({
      url: `${BASE}/store/${slug}/products/${p.handle}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
  ];
}
