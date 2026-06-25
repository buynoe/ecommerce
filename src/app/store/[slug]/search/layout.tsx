import { Metadata } from "next";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({ where: { slug }, select: { name: true } });
  const name = store?.name ?? "Store";
  return {
    title: `Search Products | ${name}`,
    description: `Browse and search all products available at ${name}.`,
    robots: { index: false, follow: true },
  };
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
