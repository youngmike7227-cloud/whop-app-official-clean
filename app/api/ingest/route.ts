// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import {
  ensureLastPricesTable,
  fetchPrevPrices,
  upsertPrices,
  ensureAlertsLogTable,
  insertAlertsLog,
} from "../../../lib/db"; // ← adjust depth if your folder is different
import { fetchLatestRawOdds } from "../../../lib/oddsProvider";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sport = url.searchParams.get("sport") || "basketball_nba";
    const thresholdParam = url.searchParams.get("threshold");
    const THRESHOLD_CENTS =
      Number(thresholdParam) > 0 ? Number(thresholdParam) : 10;

    await ensureLastPricesTable();
    await ensureAlertsLogTable();

    const raw = await fetchLatestRawOdds(sport);
    const now = Date.now();
    const keys = raw.map((r) => r.id);

    const prevMap = await fetchPrevPrices(keys);

    const alerts: any[] = [];
    const pairs = raw.map((r) => ({
      id: r.id,
      price: Number(r.price),
      ts: now,
    }));

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
    console.error("INGEST_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "ingest failed" },
      { status: 500 }
    );
  }
}
