import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAdminToken, setAdminCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin || !(await verifyPassword(password, admin.password)))
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = signAdminToken({ adminId: admin.id, email: admin.email });
    const cookieStore = await cookies();
    const { name, value, options } = setAdminCookie(token);
    cookieStore.set(name, value, options);

    return NextResponse.json({ success: true, admin: { name: admin.name, email: admin.email, role: admin.role } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
