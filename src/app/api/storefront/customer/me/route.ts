import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ customer: null });

  const full = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: { addresses: true },
  });

  return NextResponse.json({ customer: full });
}
