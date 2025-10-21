// lib/db.ts
import { sql } from '@vercel/postgres';
export { sql };

export async function ensureAlertsTable() {
  await sql/* sql */`
  CREATE TABLE IF NOT EXISTS alerts (
    id           TEXT PRIMARY KEY,
    ts           TIMESTAMP NOT NULL,
    sport        TEXT,
    league       TEXT,
    game_id      TEXT,
    market       TEXT,
    side         TEXT,
    book         TEXT,
    old_odds     INT,
    new_odds     INT,
    delta_cents  INT
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts DESC);
  `;
}
