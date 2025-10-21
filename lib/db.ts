// lib/db.ts
import { sql } from '@vercel/postgres'

export { sql }

// Optional helper: create the alerts table if it doesn’t exist
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
    `
    console.log("✅ alerts table ensured")
  } catch (err) {
    console.error("❌ failed to ensure alerts table", err)
  }
}
