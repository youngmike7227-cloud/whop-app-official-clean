import { NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport") || ""; // optional filter, e.g. basketball_nba
    const threshold = Number(searchParams.get("t") ?? 5); // default: 5¢

    // Fetch odds, optionally by sport
    const raw = await fetchLatestRawOdds(sport);
    const alerts = diffToAlerts(raw, threshold);

    return NextResponse.json({
      ok: true,
      added: alerts.length,
      alerts,
    });
  } catch (e: any) {
    console.error("INGEST_ERROR", e?.message);
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 }
      // after: const r = await fetch(url, { cache: "no-store" });
const remaining = r.headers.get("x-requests-remaining") ?? undefined;
const used = r.headers.get("x-requests-used") ?? undefined;

// ... existing mapping to `alerts`

return NextResponse.json({
  ok: true,
  added: alerts.length,
  alerts,
  remaining,
  used,
});
    );
  }
}
