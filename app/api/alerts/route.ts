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

    // Optional filters
    const league       = url.searchParams.get("league") ?? "";
    const gameId       = url.searchParams.get("gameId") ?? "";
    const marketType   = url.searchParams.get("marketType") ?? "";
    const book         = url.searchParams.get("book") ?? "";
    const minDeltaStr  = url.searchParams.get("minDeltaCents");
    const sinceMinStr  = url.searchParams.get("sinceMinutes");
    const limitParam   = url.searchParams.get("limit");

    const minDeltaCents = Number.isFinite(Number(minDeltaStr))
      ? Math.max(0, Number(minDeltaStr))
      : 0;

    const sinceMinutes = Number.isFinite(Number(sinceMinStr))
      ? Math.max(0, Number(sinceMinStr))
      : 0;

    // Convert to unix ms and compare with to_timestamp(ms/1000.0)
    const sinceMs = sinceMinutes > 0 ? Date.now() - sinceMinutes * 60_000 : 0;

    const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 500);

    // Single parameterized query; no fragment composition.
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
        (${marketType} = '' OR marketType = ${marketType}) AND
        (${book} = '' OR book = ${book}) AND
        (${minDeltaCents} = 0 OR ABS(deltaCents) >= ${minDeltaCents}) AND
        (${sinceMs} = 0 OR ts >= to_timestamp(${sinceMs} / 1000.0))
      ORDER BY ts DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    console.error("ALERTS_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "alerts query failed" },
      { status: 500 }
    );
  }
}
