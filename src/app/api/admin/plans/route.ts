import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(
    plans.map((p) => ({ ...p, features: JSON.parse(p.features as string) as string[] }))
  );
}

export async function POST(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key, name, price, description, features, isPopular, isActive, sortOrder } =
    await req.json();

  if (!key || !name || price == null)
    return NextResponse.json({ error: "key, name, price required" }, { status: 400 });

  const plan = await prisma.plan.create({
    data: {
      key,
      name,
      price: Math.round(price * 100),
      description: description ?? "",
      features: JSON.stringify(Array.isArray(features) ? features : []),
      isPopular: Boolean(isPopular),
      isActive: isActive !== false,
      sortOrder: sortOrder ?? 99,
    },
  });

  return NextResponse.json({ ...plan, features: JSON.parse(plan.features as string) });
}
