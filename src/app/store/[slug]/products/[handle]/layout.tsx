import { Metadata } from "next";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

const BASE = "https://ecomm.buynoe.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; handle: string }> }): Promise<Metadata> {
  const { slug, handle } = await params;

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, name: true, currency: true } });
  if (!store) return { title: "Product Not Found" };

  const product = await prisma.product.findUnique({
    where: { storeId_handle: { storeId: store.id, handle } },
    select: { title: true, description: true, vendor: true, productType: true, tags: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
  });
  if (!product) return { title: "Product Not Found" };

  const title = `${product.title} | ${store.name}`;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Buy ${product.title} online from ${store.name}. Fast delivery, easy returns.`;
  const url = `${BASE}/store/${slug}/products/${handle}`;
  const image = product.images[0]?.url;

  let keywords: string[] = [product.title, store.name];
  if (product.vendor) keywords.push(product.vendor);
  if (product.productType) keywords.push(product.productType);
  try { const tags = JSON.parse(product.tags || "[]"); if (Array.isArray(tags)) keywords = [...keywords, ...tags]; } catch { /* empty */ }

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(image && { images: [{ url: image, alt: product.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; handle: string }>;
}) {
  const { slug, handle } = await params;

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, currency: true } });
  const product = store
    ? await prisma.product.findUnique({
        where: { storeId_handle: { storeId: store.id, handle } },
        select: {
          title: true,
          description: true,
          vendor: true,
          images: { orderBy: { position: "asc" }, take: 5, select: { url: true } },
          variants: { where: { status: "ACTIVE" }, orderBy: { price: "asc" }, take: 1, select: { price: true, inventoryItem: { select: { available: true } } } },
        },
      })
    : null;

  const jsonLd = store && product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        ...(product.description && { description: product.description }),
        image: product.images.map(i => i.url),
        ...(product.vendor && { brand: { "@type": "Brand", name: product.vendor } }),
        offers: {
          "@type": "Offer",
          url: `${BASE}/store/${store.slug}/products/${handle}`,
          price: product.variants[0]?.price ?? 0,
          priceCurrency: store.currency || "INR",
          availability:
            (product.variants[0]?.inventoryItem?.available ?? 0) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: store.name },
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
