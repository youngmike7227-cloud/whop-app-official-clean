// app/api/alerts/recent/route.ts
import { NextResponse } from "next/server";
import { sql } from "@../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const league = url.searchParams.get("league") ?? "";
    const gameId = url.searchParams.get("gameId") ?? "";
    const market = url.searchParams.get("marketType") ?? "";
    const book   = url.searchParams.get("book") ?? "";
    const limit  = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
      200
    );

    // Single query, no SQL fragment composition:
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
        gameId       AS gameid,
        marketType   AS markettype,
        book,
        oldOdds      AS old_odds,
        newOdds      AS new_odds,
        deltaCents   AS delta_cents,
        ts
      FROM alerts_log
      WHERE
        (${league} = '' OR league = ${league}) AND
        (${gameId} = '' OR gameId = ${gameId}) AND
        (${market} = '' OR marketType = ${market}) AND
        (${book}   = '' OR book = ${book})
      ORDER BY ts DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    console.error("ALERTS_RECENT_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "recent alerts failed" },
      { status: 500 }
    );
  }
}
