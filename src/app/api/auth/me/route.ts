import { NextResponse } from "next/server";
import { getMerchant } from "@/lib/auth";
export async function GET() {
  const m = await getMerchant();
  if (!m) return NextResponse.json({ merchant: null }, { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safe } = m;
  return NextResponse.json({ merchant: safe });
}
