// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { ensureAlertsTable, sql } from "@/lib/db";
import { fetchLatestRawOdds, diffToAlerts } from "@/lib/oddsProvider"; // you already have these

export const revalidate = 0;        // never cache
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // ensure table exists first time it runs
    await ensureAlertsTable();

    const { searchParams } = new URL(req.url);
    const threshold = Number(searchParams.get("threshold") ?? 80); // small for testing
    const sport = searchParams.get("sport") ?? "";                 // optional

    // 1) fetch raw odds (optionally filtered by sport)
    const raw = await fetchLatestRawOdds(sport);

    // 2) compute alerts (diffs)
    const alerts = diffToAlerts(raw, threshold);

    // 3) write alerts to DB (only if any)
    if (alerts.length > 0) {
      // You can batch insert; simplest loop is fine for now
      for (const a of alerts) {
        await sql`
          INSERT INTO alerts (league, gameId, marketType, book, oldOdds, newOdds, deltaCents, ts)
          VALUES (${a.league}, ${a.gameId}, ${a.marketType}, ${a.book}, ${a.oldOdds}, ${a.newOdds}, ${a.deltaCents}, to_timestamp(${Math.floor(a.ts/1000)}))
        `;
      }
    }

    return NextResponse.json({ ok: true, added: alerts.length, alerts });
  } catch (e: any) {
    console.error("INGEST_ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "ingest failed" }, { status: 500 });
  }
}
