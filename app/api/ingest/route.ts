// app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport") || undefined;  // e.g. "basketball_nba"
    const tRaw = searchParams.get("t");
    const threshold = tRaw ? Math.max(1, Number(tRaw)) : 5;

    // 1) Fetch raw odds (sport optional)
    const raw = await fetchLatestRawOdds(sport);

    // 2) Compute alerts
    const alerts = diffToAlerts(raw, threshold);

    // 3) If you also fetch directly from The Odds API here (some versions do),
    //    AND you still have the Response `r`, read headers *right after* that fetch.
    //    Otherwise, skip this. (Keeping as optional)
    let remaining: string | undefined;
    let used: string | undefined;

    // If you do have a direct Response `r` from fetch to the-odds-api, it would be:
    // const r = await fetch(url, { cache: "no-store" });
    // remaining = r.headers.get("x-requests-remaining") ?? undefined;
    // used = r.headers.get("x-requests-used") ?? undefined;

    // In our current setup, we don't have `r` here because fetch happens inside the provider.
    // So we just return alerts; remaining/used will be undefined (that's OK).

    return NextResponse.json({
      ok: true,
      added: alerts.length,
      alerts,
      remaining,
      used,
    });
  } catch (e: any) {
    // keep this return *as-is*, and don't place any `const` after it
    return NextResponse.json(
      { ok: false, error: e?.message || "error" },
      { status: 500 },
    );
  }
}
