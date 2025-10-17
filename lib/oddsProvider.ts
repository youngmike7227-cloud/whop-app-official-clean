// lib/oddsProvider.ts
type RawOdds = {
  id: string;         // market id from provider
  book: string;       // e.g., "pinnacle"
  league: string;     // "NBA", "NFL"
  gameId: string;     // a provider game id
  marketType: "ML" | "SPREAD" | "TOTAL";
  side?: string;      // "LAL" / "BOS", etc for ML/SPREAD
  price: number;      // American odds, e.g., -120
  ts: number;         // unix ms
};

export type Alert = {
  id: string;
  league: string;
  gameId: string;
  marketType: "ML" | "SPREAD" | "TOTAL";
  book: string;
  oldOdds: number;
  newOdds: number;
  deltaCents: number; // absolute difference in “cents”
  ts: number;         // unix ms
};

// Example provider call. Swap URL/shape to your vendor.
export async function fetchLatestRawOdds(): Promise<RawOdds[]> {
  const url = "https://api.the-odds-api.com/v4/sports/upcoming/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=4cead2e799465a1403e9a7e65fe7d90c"const r = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.ODDS_API_KEY}` },
    // Don’t cache: we want the freshest numbers
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!r.ok) throw new Error("odds fetch failed");
  return r.json();
}

// Minimal in-memory last snapshot (works on single function invocations)
let LAST: Map<string, number> = new Map();

export function diffToAlerts(raw: RawOdds[], thresholdCents = 10): Alert[] {
  const alerts: Alert[] = [];
  for (const o of raw) {
    const key = `${o.book}:${o.marketType}:${o.gameId}:${o.side || ""}`;
    const prev = LAST.get(key);
    if (typeof prev === "number") {
      const deltaCents = Math.abs(toCents(o.price) - toCents(prev));
      if (deltaCents >= thresholdCents) {
        alerts.push({
          id: `${key}:${o.ts}`,
          league: o.league,
          gameId: o.gameId,
          marketType: o.marketType,
          book: o.book,
          oldOdds: prev,
          newOdds: o.price,
          deltaCents,
          ts: o.ts,
        });
      }
    }
    LAST.set(key, o.price);
  }
  return alerts;
}

function toCents(american: number): number {
  // convert American odds to “cents” scale for diffs (simple absolute change)
  // e.g., -120 → 120, +150 → 150
  return Math.abs(american);
}
