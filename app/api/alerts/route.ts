// app/api/alerts/route.ts
import { NextResponse } from "next/server";
import {
  sql,
  ensureAlertsLogTable,
  insertAlertsLog,
} from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    // make sure table exists (first call)
    await ensureAlertsLogTable();

    // return the 50 most recent alerts
    const { rows } = await sql`
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
      LIMIT 50
    `;

    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    console.error("alerts GET failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "alerts fetch failed" },
      { status: 500 }
    );
  }
}
