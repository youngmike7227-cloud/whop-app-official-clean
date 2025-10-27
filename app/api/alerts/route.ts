import { NextResponse } from "next/server";
import { sql } from "@../../../lib/db"; // your re-export of @vercel/postgres sql

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const sport = url.searchParams.get("sport") ?? "";
  const book  = url.searchParams.get("book") ?? "";
  const since = Number(url.searchParams.get("since") ?? 0); // ms epoch, optional
  const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") ?? 200)));

  // Build WHERE as SQL fragments (NOT strings, NOT Promises, and no `await` here)
  const conds: ReturnType<typeof sql>[] = [];
  if (sport) conds.push(sql`league = ${sport}`);
  if (book)  conds.push(sql`book = ${book}`);
  if (since) conds.push(sql`ts >= to_timestamp(${since} / 1000.0)`);

  // This is a SQL fragment, not a Promise
  const where: ReturnType<typeof sql> =
    conds.length ? sql`WHERE ${sql.join(conds, sql` AND `)}` : sql``;

  // Query using the fragment
  const { rows } = await sql`
    SELECT old_odds, new_odds, delta_cents, ts
    FROM alerts_log
    ${where}
    ORDER BY ts DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({ ok: true, alerts: rows });
}
