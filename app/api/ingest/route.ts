// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import { ensureAlertsTable, sql } from "../../../lib/db";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";

import {
  ensureLastPricesTable,
  fetchPrevPrices,
  upsertPrices,
} from "../../../lib/db";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    // Extract optional query parameters
    const url = new URL(req.url);
    const sport = url.searchParams.get("sport") || "NBA"; // default: NBA
    const thresholdParam = url.searchParams.get("threshold");
    const THRESHOLD_CENTS = thresholdParam ? Number(thresholdParam) : 10; // default: 10

    // 1) Ensure DB table exists
    await ensureLastPricesTable();

    // 2) Fetch odds for selected sport
    const raw = await fetchLatestRawOdds(sport); // provider supports league argument
    const now = Date.now();
    const keys = raw.map(r => r.id);

    // 3) Get previous prices
    const prevMap = await fetchPrevPrices(keys);

    // 4) Detect alerts
    const alerts: any[] = [];
    const pairs = raw.map(r => ({ id: r.id, price: Number(r.price), ts: now }));

    for (const r of raw) {
      const prev = prevMap.get(r.id);
      if (typeof prev === "number") {
        const deltaCents = Math.abs(Number(r.price) - prev);
        if (deltaCents >= THRESHOLD_CENTS) {
          alerts.push({
            id: r.id,
            league: r.league,
            gameId: r.gameId,
            marketType: r.marketType,
            book: r.book,
            oldOdds: prev,
            newOdds: Number(r.price),
            deltaCents,
            ts: now,
          });
        }
      }
    }

    // 5) Save latest odds snapshot
    await upsertPrices(pairs);
 await insertAlertsLog(alerts);

    return NextResponse.json({
      ok: true,
      sport,
      threshold: THRESHOLD_CENTS,
      added: alerts.length,
      alerts,
    });
  } catch (err: any) {
    console.error("INGEST_ERROR:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "ingest failed" },
      { status: 500 }
    );
  }
}
