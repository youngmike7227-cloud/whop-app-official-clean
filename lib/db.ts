// lib/db.ts
import { sql } from '@vercel/postgres';
export { sql };

/** Ensure the alerts table (you already have this) */
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
        deltaCents FLOAT,
        ts TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ alerts table ensured");
  } catch (err) {
    console.error("❌ failed to ensure alerts table", err);
  }
}

/** Ensure persistent snapshot of last prices */
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

export async function fetchPrevPrices(keys: string[]) {
  // nothing to fetch
  if (!keys || keys.length === 0) return new Map<string, number>();

  // Build a parameterized list: ${inList} becomes "$1, $2, $3..."
  const frags = keys.map(k => sql`${k}`);

  // Compose a single SQL fragment "a, b, c" from the fragments
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
  for (const r of rows) map.set(r.market_id as string, Number(r.price));
  return map;
}

/** Upsert (insert/update) the latest prices after each run */
export async function upsertPrices(
  pairs: { id: string; price: number; ts: number }[]
) {
  if (!pairs.length) return;

  for (const p of pairs) {
    await sql`
      INSERT INTO last_prices (market_id, price, ts)
      VALUES (${p.id}, ${p.price}, to_timestamp(${p.ts} / 1000.0))
      ON CONFLICT (market_id)
      DO UPDATE SET price = EXCLUDED.price, ts = EXCLUDED.ts
    `;
  }
}
