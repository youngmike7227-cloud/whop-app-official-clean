// app/api/alerts/recent/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db"; // adjust if you use the "@/lib/db" alias

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const league   = url.searchParams.get("league") || "";
    const gameId   = url.searchParams.get("gameId") || "";
    const market   = url.searchParams.get("marketType") || "";
    const book     = url.searchParams.get("book") || "";
    const limitRaw = url.searchParams.get("limit") || "50";
    const limit    = Math.min(Math.max(parseInt(limitRaw, 10) || 50, 1), 200);

    // --- Build WHERE as a SQL fragment (NO await here) -----------------------
    const parts: any[] = [];
    if (league) parts.push(sql`league = ${league}`);
    if (gameId) parts.push(sql`gameId = ${gameId}`);
    if (market) parts.push(sql`marketType = ${market}`);
    if (book)   parts.push(sql`book = ${book}`);

    let where = sql``;
    if (parts.length > 0) {
      // reduce to "p1 AND p2 AND p3 ..."
      let andChain = parts[0];
      for (let i = 1; i < parts.length; i++) {
        andChain = sql`${andChain} AND ${parts[i]}`;
      }
      where = sql`WHERE ${andChain}`;
    }
    // ------------------------------------------------------------------------

    const { rows } = await sql<{
      id: string;
      league: string;
      gameid: string;
      markettype: string;
      book: string;
      old_odds: number;
      new_odds: number;
      delta_cents: number;
      ts: Date;
    }>`
      SELECT
        id,
        league,
        gameId,
        marketType,
        book,
        oldOdds   AS old_odds,
        newOdds   AS new_odds,
        deltaCents AS delta_cents,
        ts
      FROM alerts_log
      ${where}
      ORDER BY ts DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "recent alerts failed" },
      { status: 500 }
    );
  }
}
