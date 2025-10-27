// app/api/alerts/recent/route.ts
import { NextResponse } from "next/server";
// If you have the alias set up, you can use: import { sql } from "@/lib/db";
import { sql } from "../../../lib/db";

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
    const limit    = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1),
      200
    );

    // ------------------ BUILD WHERE AS A SQL FRAGMENT (NO await) ------------------
    let where = sql``;       // starts empty
    let first = true;        // to decide WHERE vs AND

    const add = (frag: any) => {
      if (first) {
        where = sql`WHERE ${frag}`;
        first = false;
      } else {
        where = sql`${where} AND ${frag}`;
      }
    };

    if (league) add(sql`league = ${league}`);
    if (gameId) add(sql`gameId = ${gameId}`);
    if (market) add(sql`marketType = ${market}`);
    if (book)   add(sql`book = ${book}`);
    // ------------------------------------------------------------------------------

    // Only NOW do we await the query
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
        oldOdds     AS old_odds,
        newOdds     AS new_odds,
        deltaCents  AS delta_cents,
        ts
      FROM alerts_log
      ${where}
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
