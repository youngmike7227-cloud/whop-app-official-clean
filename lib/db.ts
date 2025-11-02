// lib/db.ts
import { sql } from "@vercel/postgres";
export { sql };

/* ------------------------------------------------------------
   1) Alerts (UI) table – you already had this
-------------------------------------------------------------*/
export async function ensureAlertsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        league TEXT,
        gameId TEXT,
        marketType TEXT,
        book TEXT,
        oldOdds FLOAT,
        newOdds FLOAT,
        deltaCents INT,
        ts TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ alerts table ensured");
  } catch (err) {
    console.error("❌ failed to ensure alerts table", err);
  }
}

/* ------------------------------------------------------------
   2) Latest prices snapshot (used for diffs)
-------------------------------------------------------------*/
export async function ensureLastPricesTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS last_prices (
        market_id TEXT PRIMARY KEY,  -- e.g. gameId:book:ML:side
        price FLOAT NOT NULL,
        ts TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ last_prices table ensured");
  } catch (err) {
    console.error("❌ failed to ensure last_prices table", err);
  }
}

/**
 * Fetch previous prices for a list of market IDs.
 * (BORING VERSION – 1 query per id, so TS stops yelling 🙃)
 */
export async function fetchPrevPrices(keys: string[]) {
  if (!keys || keys.length === 0) return new Map<string, number>();

  const map = new Map<string, number>();

  for (const id of keys) {
    const { rows } = await sql`
      SELECT market_id, price
      FROM last_prices
      WHERE market_id = ${id}
      LIMIT 1
    `;
    if (rows.length > 0) {
      const r = rows[0] as { market_id: string; price: number };
      map.set(r.market_id, Number(r.price));
    }
  }

  return map;
}

/* ------------------------------------------------------------
   3) Upsert latest prices after each run
-------------------------------------------------------------*/
export async function upsertPrices(
  pairs: { id: string; price: number; ts: number }[]
) {
  if (!pairs || pairs.length === 0) return;

  for (const p of pairs) {
    await sql`
      INSERT INTO last_prices (market_id, price, ts)
      VALUES (${p.id}, ${p.price}, to_timestamp(${p.ts} / 1000.0))
      ON CONFLICT (market_id)
      DO UPDATE SET price = EXCLUDED.price, ts = EXCLUDED.ts
    `;
  }
}

/* ------------------------------------------------------------
   4) alerts_log – persistent history of detected alerts
-------------------------------------------------------------*/
export async function ensureAlertsLogTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS alerts_log (
        id SERIAL PRIMARY KEY,
        market_id TEXT NOT NULL,
        league TEXT,
        game_id TEXT,
        market_type TEXT,
        book TEXT,
        old_odds FLOAT,
        new_odds FLOAT,
        delta_cents INT,
        ts TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    console.log("✅ alerts_log table ensured");
  } catch (err) {
    console.error("❌ failed to ensure alerts_log table", err);
  }
}

/**
 * Bulk insert alerts from a run (what /api/ingest finds)
 */
export async function insertAlertsLog(
  alerts: {
    id: string;
    league: string;
    gameId: string;
    marketType: string;
    book: string;
    oldOdds: number;
    newOdds: number;
    deltaCents: number;
    ts: number;
  }[]
) {
  if (!alerts || alerts.length === 0) return;

  for (const a of alerts) {
    await sql`
      INSERT INTO alerts_log (
        market_id,
        league,
        game_id,
        market_type,
        book,
        old_odds,
        new_odds,
        delta_cents,
        ts
      )
      VALUES (
        ${a.id},
        ${a.league},
        ${a.gameId},
        ${a.marketType},
        ${a.book},
        ${a.oldOdds},
        ${a.newOdds},
        ${a.deltaCents},
        to_timestamp(${a.ts} / 1000.0)
      )
    `;
  }
}

/* ------------------------------------------------------------
   5) Query recent alerts (used by /api/alerts or /api/alerts/recent)
-------------------------------------------------------------*/
export async function getRecentAlerts({
  limit = 50,
  league,
  sinceMinutes,
}: {
  limit?: number;
  league?: string;
  sinceMinutes?: number;
}) {
  // we’ll build the WHERE string manually — simpler than nesting sql`` in sql``
  const whereParts: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (league) {
    whereParts.push(`league = $${idx++}`);
    params.push(league);
  }
  if (sinceMinutes) {
    whereParts.push(`ts >= NOW() - INTERVAL '${sinceMinutes} minutes'`);
  }

  const whereClause =
    whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  // build final SQL with text() so TS doesn’t complain
  const text = `
    SELECT
      market_id,
      league,
      game_id,
      market_type,
      book,
      old_odds,
      new_odds,
      delta_cents,
      ts
    FROM alerts_log
    ${whereClause}
    ORDER BY ts DESC
    LIMIT ${limit}
  `;

  // @vercel/postgres lets us do this
  const { rows } = await sql.query(text, params);

  return rows;
}
