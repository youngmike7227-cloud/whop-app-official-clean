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
    const limit = Number(limitParam || "100");

    // read from alerts_log the same way
    const rows = league
      ? await sql`
          SELECT
            id,
            league,
            game_id,
            market_type,
            book,
            old_odds,
            new_odds,
            delta_cents,
            ts
          FROM alerts_log
          WHERE league = ${league}
          ORDER BY ts DESC
          LIMIT ${limit};
        `
      : await sql`
          SELECT
            id,
            league,
            game_id,
            market_type,
            book,
            old_odds,
            new_odds,
            delta_cents,
            ts
          FROM alerts_log
          ORDER BY ts DESC
          LIMIT ${limit};
        `;

    const alerts = rows.map((r: any) => ({
      id: r.id,
      league: r.league,
      gameId: r.game_id,        // JS camelCase
      marketType: r.market_type,
      book: r.book,
      oldOdds: r.old_odds,
      newOdds: r.new_odds,
      deltaCents: r.delta_cents,
      ts: r.ts,
    }));

    return NextResponse.json({ ok: true, count: alerts.length, alerts });
  } catch (err: any) {
    console.error("ALERTS_ROUTE_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "alerts route failed" },
      { status: 500 }
    );
  }
}
