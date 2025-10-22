// lib/oddsProvider.ts

// ---------- Types ----------
export type RawOdds = {
  id: string;              // market id you build (gameId:book:ML:side)
  league: string;          // e.g. NBA, MLB
  gameId: string;          // provider game id
  marketType: "ML" | "SPREAD" | "TOTAL";
  book: string;            // e.g. bovada, fanduel
  price: number;           // american odds, e.g. -120, +150
  ts: number;              // unix ms
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

// ---------- Provider fetch ----------

/**
 * Fetch latest raw odds from The Odds API.
 * If `sport` is given (e.g. 'basketball_nba'), we hit the sport-specific endpoint.
 * Otherwise we use 'upcoming'.
 */
export async function fetchLatestRawOdds(sport?: string): Promise<RawOdds[]> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("missing ODDS_API_KEY");

  // Use sport-specific if provided, otherwise 'upcoming'
  // moneyline = 'h2h', oddsFormat=american
  const base = "https://api.the-odds-api.com/v4";
  const path = sport
    ? `/sports/${encodeURIComponent(
        sport
      )}/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${key}`
    : `/sports/upcoming/odds/?regions=us&markets=h2h&oddsFormat=american&apiKey=${key}`;

  const url = `${base}${path}`;

  const r = await fetch(url, {
    // we want the freshest numbers
    cache: "no-store",
    // small revalidate window OK if you want
    next: { revalidate: 0 },
  });

  if (!r.ok) {
    let text: string | undefined;
    try {
      text = await r.text();
    } catch {}
    throw new Error(`fetch failed: ${r.status} ${text?.slice(0, 200) ?? ""}`);
  }

  const data = (await r.json()) as any[];

  // Map vendor JSON to RawOdds (moneyline = 'h2h' only)
  // Vendor shape (simplified):
  // [
  //   {
  //     id: "gameId",
  //     sport_title: "NBA",
  //     bookmakers: [
  //       {
  //         key: "draftkings",
  //         markets: [
  //           { key: "h2h", outcomes: [{ name: "Lakers", price: -120 }, { ... }] }
  //         ]
  //       },
  //       ...
  //     ]
  //   },
  //   ...
  // ]
  const out: RawOdds[] = [];
  const now = Date.now();

  for (const ev of data ?? []) {
    const league = ev?.sport_title ?? "Unknown";
    const gameId = ev?.id as string | undefined;
    if (!gameId) continue;

    for (const bk of ev?.bookmakers ?? []) {
      const book = bk?.key as string | undefined;
      if (!book) continue;

      for (const m of bk?.markets ?? []) {
        if (m?.key !== "h2h") continue; // ML only
        for (const o of m?.outcomes ?? []) {
          // o.name is the team, e.g. "Lakers"
          const side = o?.name as string | undefined;
          const price = Number(o?.price);
          if (!side || Number.isNaN(price)) continue;

          const id = `${gameId}:${book}:ML:${side}`;
          out.push({
            id,
            league,
            gameId,
            marketType: "ML",
            book,
            price,
            ts: now,
          });
        }
      }
    }
  }

  return out;
}

// ---------- Diff → Alerts ----------

// In-memory last snapshot (persists per warm serverless instance).
const LAST = new Map<string, number>();

/**
 * Compare the current raw odds to the last snapshot and produce Alerts
 * where movement >= thresholdCents.
 *
 * thresholdCents: integer in "cents" (e.g. | -120 -> 120 |, | +150 -> 150 |)
 */
export function diffToAlerts(
  raw: RawOdds[],
  thresholdCents = 10
): Alert[] {
  const alerts: Alert[] = [];

  for (const o of raw) {
    // One key per market side per book per game
    const key = `${o.book}:${o.marketType}:${o.gameId}:${o.id}`;

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

    // Always update snapshot to the latest observed value
    LAST.set(key, o.price);
  }

  return alerts;
}

function toCents(american: number): number {
  // Simple absolute mapping: e.g. -120 => 120, +150 => 150
  return Math.abs(american);
}
