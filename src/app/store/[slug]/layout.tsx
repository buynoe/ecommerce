import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";

export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { primaryColor: true },
  });
  const brand = store?.primaryColor || "#16a34a";

  return (
    <>
      <style>{`:root { --sf-brand: ${brand}; }`}</style>
      {children}
    </>
  );
}
