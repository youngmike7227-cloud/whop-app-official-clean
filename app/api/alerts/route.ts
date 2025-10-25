// app/api/alerts/route.ts
import { NextResponse } from "next/server";
// use relative path from /app/api/alerts -> /lib/db
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/alerts
 * Returns the 200 most recent alerts from the DB.
 */
export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        id,
        league,
        gameId,
        marketType,
        book,
        oldOdds,
        newOdds,
        deltaCents,
        ts
      FROM alerts
      ORDER BY ts DESC
      LIMIT 200
    `;
    return NextResponse.json({ ok: true, alerts: rows });
  } catch (err: any) {
    console.error("ALERTS_ROUTE_ERROR:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "failed to fetch alerts" },
      { status: 500 }
    );
  }
}
