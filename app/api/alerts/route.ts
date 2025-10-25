import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sport = url.searchParams.get("sport");     // e.g. "basketball_nba"
    const book  = url.searchParams.get("book");      // optional
    const limit = Number(url.searchParams.get("limit") ?? 200);

    // 1) Build WHERE as a SQL fragment (not a Promise!)
    const conds: ReturnType<typeof sql>[] = [];
    if (sport) conds.push(sql`league = ${sport}`);
    if (book)  conds.push(sql`book = ${book}`);

    const where =
      conds.length > 0 ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;

    // 2) Use the fragment inside the main query
    const { rows } = await sql`
      SELECT
        old_odds,
        new_odds,
        delta_cents,
        ts
      FROM alerts_log
      ${where}
      ORDER BY ts DESC
      LIMIT ${limit}
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
