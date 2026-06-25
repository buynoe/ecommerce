import { Metadata } from "next";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

const BASE = "https://ecomm.buynoe.com";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; handle: string }> }): Promise<Metadata> {
  const { slug, handle } = await params;

  const store = await prisma.store.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!store) return { title: "Collection Not Found" };

  const collection = await prisma.collection.findUnique({
    where: { storeId_handle: { storeId: store.id, handle } },
    select: { title: true, description: true, imageUrl: true },
  });
  if (!collection) return { title: "Collection Not Found" };

  const title = `${collection.title} | ${store.name}`;
  const description = collection.description
    ? collection.description.slice(0, 160)
    : `Shop ${collection.title} at ${store.name}. Browse our curated selection of products.`;
  const url = `${BASE}/store/${slug}/collections/${handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(collection.imageUrl && { images: [{ url: collection.imageUrl, alt: collection.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(collection.imageUrl && { images: [collection.imageUrl] }),
    },
    robots: { index: true, follow: true },
  };
}

export default function CollectionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
