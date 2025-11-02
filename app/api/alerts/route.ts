import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const league = url.searchParams.get("league");
    const limitParam = url.searchParams.get("limit");
    const limit = Number(limitParam || "50");

    let rows;

    // IMPORTANT: use snake_case columns that are in alerts_log:
    // id, league, game_id, market_type, book, old_odds, new_odds, delta_cents, ts

    if (league) {
      // filtered
      rows = await sql`
        SELECT
          id,
          league,
          game_id      AS "gameId",
          market_type  AS "marketType",
          book,
          old_odds     AS "oldOdds",
          new_odds     AS "newOdds",
          delta_cents  AS "deltaCents",
          ts
        FROM alerts_log
        WHERE league = ${league}
        ORDER BY ts DESC
        LIMIT ${limit};
      `;
    } else {
      // unfiltered
      rows = await sql`
        SELECT
          id,
          league,
          game_id      AS "gameId",
          market_type  AS "marketType",
          book,
          old_odds     AS "oldOdds",
          new_odds     AS "newOdds",
          delta_cents  AS "deltaCents",
          ts
        FROM alerts_log
        ORDER BY ts DESC
        LIMIT ${limit};
      `;
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      alerts: rows,
    });
  } catch (err: any) {
    console.error("RECENT_ALERTS_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "recent alerts failed" },
      { status: 500 }
    );
  }
}
