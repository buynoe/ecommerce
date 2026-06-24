import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;

  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      store: {
        include: {
          _count: { select: { orders: true, products: true, customers: true } },
        },
      },
      transactions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ merchant });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const allowed: Record<string, unknown> = {};
  if (body.plan)       allowed.plan = body.plan;
  if (body.planStatus) allowed.planStatus = body.planStatus;
  if (body.emailVerified !== undefined) allowed.emailVerified = body.emailVerified;

  const updated = await prisma.merchant.update({ where: { id }, data: allowed });
  return NextResponse.json({ merchant: updated });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin || admin.role !== "SUPER_ADMIN")
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  await prisma.merchant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
