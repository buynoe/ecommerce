import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, currency: true, primaryColor: true, description: true, logo: true,
      shippingMethods: { where: { isActive: true } },
      paymentGateways: {
        where: { isActive: true },
        select: { id: true, provider: true, name: true }, // never expose config/secrets to storefront
      },
      banners: { where: { isActive: true }, orderBy: { position: "asc" } },
    },
  });
  if (!store) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ store });
}
