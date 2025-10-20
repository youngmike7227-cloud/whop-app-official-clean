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

// Accept an optional sport key, e.g. "basketball_nba"
export async function fetchLatestRawOdds(sport?: string): Promise<RawOdds[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("missing ODDS_API_KEY");

  // If a sport is provided, hit the sport-specific endpoint.
  // Otherwise use the "upcoming" endpoint (same as before).
  const base = sport && sport.trim()
    ? `https://api.the-odds-api.com/v4/sports/${sport}/odds/`
    : `https://api.the-odds-api.com/v4/sports/upcoming/odds/`;

  const url =
    `${base}?regions=us&markets=h2h&oddsFormat=american&apiKey=${key}`;

  const r = await fetch(url, {
    cache: "no-store",
    // If you already set `next: { revalidate: 0 }` before, you can keep it:
    // next: { revalidate: 0 },
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`fetch failed: ${r.status} ${text.slice(0, 200)}`);
  }

  const json = await r.json();
  // … keep your existing mapping logic returning RawOdds[] …
  // Example sketch (use your current mapping):
  const out: RawOdds[] = [];
  const now = Date.now();

  for (const ev of json ?? []) {
    const league = ev.sport_title ?? "Unknown";
    const gameId = ev.id;
    for (const bk of ev.bookmakers ?? []) {
      const book = bk.key;
      for (const m of bk.markets ?? []) {
        if (m.key !== "h2h") continue;
        for (const o of m.outcomes ?? []) {
          out.push({
            id: `${gameId}:${book}:ML:${o.name}`,
            league,
            gameId,
            marketType: "ML",
            book,
            price: Number(o.price),
            ts: now,
          });
        }
      }
    }
  }

  return out;
}

  return out;
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
