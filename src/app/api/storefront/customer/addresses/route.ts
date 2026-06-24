import { NextRequest, NextResponse } from "next/server";
import { getCustomerFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storeId, firstName, lastName, phone, address1, address2, city, state, pincode, isDefault } = body;
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

  const customer = await getCustomerFromCookie(storeId);
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // If this is default, unset all others first
  if (isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      firstName, lastName, phone: phone || null,
      address1, address2: address2 || null,
      city, state, pincode, country: "India",
      isDefault: isDefault ?? false,
    },
  });
  return NextResponse.json({ address });
}
