// lib/oddsProvider.ts

// ---------- Types ----------
export type RawOdds = {
  id: string;         // market id you build (gameId:book:ML:side)
  league: string;     // e.g. NBA, MLB
  gameId: string;     // provider game id
  marketType: "ML" | "SPREAD" | "TOTAL";
  book: string;       // e.g. bovada, fanduel
  price: number;      // american odds, e.g. -120, +150
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
  deltaCents: number;
  ts: number;
};

// ---------- Fetch & map ----------
export async function fetchLatestRawOdds(sport?: string): Promise<RawOdds[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("missing ODDS_API_KEY");

  const base = sport && sport.trim()
    ? `https://api.the-odds-api.com/v4/sports/${sport}/odds/`
    : `https://api.the-odds-api.com/v4/sports/upcoming/odds/`;

  const url = `${base}?regions=us&markets=h2h&oddsFormat=american&apiKey=${key}`;

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`fetch failed: ${r.status} ${text.slice(0, 200)}`);
  }

  const json = await r.json();
  const out: RawOdds[] = [];
  const now = Date.now();

  // Map provider shape -> RawOdds[]
  for (const ev of json ?? []) {
    const league: string = ev?.sport_title ?? "Unknown";
    const gameId: string = ev?.id;
    for (const bk of ev?.bookmakers ?? []) {
      const book: string = bk?.key;
      for (const m of bk?.markets ?? []) {
        // moneyline only for now
        if (m?.key !== "h2h") continue;
        for (const o of m?.outcomes ?? []) {
          out.push({
            id: `${gameId}:${book}:ML:${o?.name}`,
            league,
            gameId,
            marketType: "ML",
            book,
            price: Number(o?.price),
            ts: now,
          });
        }
      }
    }
  }

  return out; // <— exactly one return and then close the function
}

// ---------- Diff to alerts (in-memory snapshot) ----------
let LAST: Map<string, number> = new Map();

/**
 * Compares the latest RawOdds vs the last snapshot to produce Alerts.
 * @param raw list of latest quotes
 * @param thresholdCents absolute difference in "cents" to trigger (e.g., 5)
 */
export function diffToAlerts(raw: RawOdds[], thresholdCents = 10): Alert[] {
  const alerts: Alert[] = [];
  for (const o of raw) {
    const key = `${o.book}:${o.marketType}:${o.gameId}|${o.id}`;
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

// Convert American odds to a simple absolute “cents” value for diffs
function toCents(american: number): number {
  return Math.abs(american);
}
