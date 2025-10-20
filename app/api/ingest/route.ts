import { NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";
import { pushAlerts, getAlerts } from "../../../lib/alertsBuffer";

export async function GET() {
  try {
    const raw = await fetchLatestRawOdds();
    const alerts = diffToAlerts(raw, 5); // try 5¢ to see movement faster
 const sport = searchParams.get("sport") || "";        // e.g. "basketball_nba"

    const raw = await fetchLatestRawOdds(sport);          // modify provider to accept sport
    const alerts = diffToAlerts(raw, threshold);
    // return alerts as you do now...
  } catch (e: any) {
    console.error("INGEST_ERROR", e?.message);
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
