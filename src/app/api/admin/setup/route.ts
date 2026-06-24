// One-time setup: creates the first Super Admin. Disabled once any admin exists.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const count = await prisma.admin.count();
  if (count > 0)
    return NextResponse.json({ error: "Admin already exists. Use login." }, { status: 403 });

  const { name, email, password } = await req.json();
  if (!name || !email || !password || password.length < 8)
    return NextResponse.json({ error: "name, email and password (8+ chars) required" }, { status: 400 });

  const admin = await prisma.admin.create({
    data: { name, email: email.toLowerCase(), password: await hashPassword(password), role: "SUPER_ADMIN" },
  });

  return NextResponse.json({ success: true, id: admin.id, email: admin.email });
}
