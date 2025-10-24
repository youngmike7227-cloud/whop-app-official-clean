import { NextResponse } from "next/server";
import { getAlerts } from "../../../lib/alertsBuffer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 200)));
  const league = url.searchParams.get("league") ?? "";
  const book = url.searchParams.get("book") ?? "";

  const filters = [];
  if (league) filters.push(sql`league = ${league}`);
  if (book) filters.push(sql`book = ${book}`);

  const where = filters.length ? sql`WHERE ${sql.join(filters, sql` AND `)}` : sql``;

  const { rows } = await sql`
    SELECT market_id, league, game_id, market_type, book,
           old_odds, new_odds, delta_cents, ts
    FROM alerts_log
    ${where}
    ORDER BY ts DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ ok: true, alerts: rows });
}
