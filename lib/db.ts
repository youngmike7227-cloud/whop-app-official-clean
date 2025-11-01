// lib/db.ts
import { sql } from "@vercel/postgres";
export { sql };

/**
 * 1) alerts (UI) table – this is the one your page reads from
 */
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

/**
 * 2) last_prices – snapshot table we use for diffing
 */
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
 * 3) get previous prices for a list of market_ids
 */
export async function fetchPrevPrices(keys: string[]) {
  if (!keys || keys.length === 0) return new Map<string, number>();

  // build a safe IN (...) without using sql.join (vercel type issue)
  const frags = [sql`${keys[0]}`];
  for (let i = 1; i < keys.length; i++) {
    frags.push(sql`${keys[i]}`);
  }

  let inList = frags[0];
  for (let i = 1; i < frags.length; i++) {
    inList = sql`${inList}, ${frags[i]}`;
  }

  const { rows } = await sql`
    SELECT market_id, price
    FROM last_prices
    WHERE market_id IN (${inList})
  `;

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.market_id as string, Number(r.price));
  }
  return map;
}

/**
 * 4) upsert latest prices after each run
 */
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

/* ------------------------------------------------------------------
   NEW: alerts_log table + bulk insert
------------------------------------------------------------------ */

/**
 * create table to store EVERY alert from every ingest run
 */
export async function ensureAlertsLogTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS alerts_log (
        id SERIAL PRIMARY KEY,
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
 * bulk insert all alerts from one ingest run
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
      INSERT INTO alerts_log
        (league, game_id, market_type, book,
         old_odds, new_odds, delta_cents, ts)
      VALUES
        (
          ${a.league},
          ${a.gameId},
          ${a.marketType},
          ${a.book},
          ${a.oldOdds},
          ${a.newOdds},
          ${a.deltaCents},
          to_timestamp(${a.ts} / 1000.0)
        );
    `;
  }
}
