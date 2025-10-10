import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.WHOP_CLIENT_ID!;
  const redirectUri = encodeURIComponent(process.env.WHOP_REDIRECT_URI!);
  // Whop OAuth authorization endpoint
  const url = `https://whop.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=read`;
  return NextResponse.redirect(url);
}
