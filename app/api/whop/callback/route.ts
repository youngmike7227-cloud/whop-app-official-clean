import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getMembershipStatus } from "../../../../lib/whop";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect("/");

  try {
    const token = await exchangeCodeForToken(code);
    const isActive = await getMembershipStatus(token);
    const next = isActive ? "/" : "/upgrade";
    return NextResponse.redirect(next);
  } catch (e) {
    return NextResponse.redirect("/");
  }
}
export async function POST(req: Request) {
  const event = await req.json();
  return new Response("ok");
}
