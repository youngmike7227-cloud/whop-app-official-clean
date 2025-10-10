import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  // Example stub: protect /settings; in real life verify Whop session + membership
  if (url.pathname.startsWith("/settings")) {
    const hasSession = true; // TODO: replace
    const isMember = true;   // TODO: replace
    if (!hasSession) return NextResponse.redirect(new URL("/", req.url));
    if (!isMember) return NextResponse.redirect(new URL("/upgrade", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/settings"]
}
