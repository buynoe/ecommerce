import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const data = plans.map((p) => ({
    ...p,
    features: JSON.parse(p.features as string) as string[],
    priceRupees: p.price / 100,
  }));

  return NextResponse.json(data);
}
