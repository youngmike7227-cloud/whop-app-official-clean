import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") ?? "";
  const book  = url.searchParams.get("book") ?? "";
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") ?? 200)));

  // Build conditions as SQL fragments (do NOT await anything here)
  const conds: ReturnType<typeof sql>[] = [];
  if (sport) conds.push(sql`league = ${sport}`);
  if (book)  conds.push(sql`book = ${book}`);

  const { rows } = await sql`
    SELECT old_odds, new_odds, delta_cents, ts
    FROM alerts_log
    ${conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``}
    ORDER BY ts DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ ok: true, alerts: rows });
}
