import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.price !== undefined) update.price = Math.round(Number(body.price) * 100);
  if (body.description !== undefined) update.description = body.description;
  if (body.features !== undefined)
    update.features = JSON.stringify(Array.isArray(body.features) ? body.features : []);
  if (body.isPopular !== undefined) update.isPopular = Boolean(body.isPopular);
  if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) update.sortOrder = Number(body.sortOrder);

  const plan = await prisma.plan.update({ where: { id }, data: update });
  return NextResponse.json({ ...plan, features: JSON.parse(plan.features as string) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
