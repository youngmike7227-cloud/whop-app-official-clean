// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isAuthed = req.cookies.get("whop_token"); // or your session cookie
  const pathname = req.nextUrl.pathname;

  const gated = ["/settings", "/alerts", "/pro"]; // adjust
  if (gated.includes(pathname) && !isAuthed) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }
  return NextResponse.next();
}
