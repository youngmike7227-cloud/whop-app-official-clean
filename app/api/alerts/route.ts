// app/api/alerts/recent/route.ts
import { NextResponse } from "next/server";
import { sql } from ../../../lib/alertsBuffer";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 200)));
    const league = url.searchParams.get("league") || "";
    const book = url.searchParams.get("book") || "";

    // Build simple WHERE without relying on sql.join typings
    let where = sql``;
    if (league && book) {
      where = sql`WHERE league = ${league} AND book = ${book}`;
    } else if (league) {
      where = sql`WHERE league = ${league}`;
    } else if (book) {
      where = sql`WHERE book = ${book}`;
    }

    const { rows } = await sql`
      SELECT market_id, league, game_id, market_type, book,
             old_odds, new_odds, delta_cents, ts
      FROM alerts_log
      ${where}
      ORDER BY ts DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    console.error("RECENT_ALERTS_ERROR:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "recent failed" },
      { status: 500 }
    );
  }
}
