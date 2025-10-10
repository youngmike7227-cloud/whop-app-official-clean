import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // TODO: verify signature
  const event = body?.type;
  switch (event) {
    case "purchase.created":
      // grant access, send welcome email
      break;
    case "subscription.canceled":
    case "subscription.expired":
      // revoke access
      break;
    default:
      break;
  }
  return NextResponse.json({ ok: true });
}
