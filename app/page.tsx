"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Alert = {
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

export default function Home() {
  // --- state ---
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // new controls
  const [sport, setSport] = useState("basketball_nba");
  const [threshold, setThreshold] = useState(5);
  const [remaining, setRemaining] = useState<string | undefined>();

  // --- fetch one tick ---
  async function load() {
    try {
      setError(null);
      const res = await fetch(`/api/ingest?sport=${sport}&t=${threshold}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "ingest failed");
      }

      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setRemaining(data.remaining);
      setLastUpdated(Date.now());
      return true; // success for backoff
    } catch (e: any) {
      setError(e?.message || "request failed");
      return false; // failure for backoff
    }
  }

  // --- CSV export (inside the component) ---
  function exportCsv(rows: Alert[]) {
    const header = [
      "time",
      "league",
      "book",
      "market",
      "game",
      "old",
      "new",
      "delta",
    ].join(",");
    const body = rows
      .map((a) =>
        [
          new Date(a.ts).toISOString(),
          a.league,
          a.book,
          a.marketType,
          a.gameId,
          a.oldOdds,
          a.newOdds,
          a.deltaCents,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alerts.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- polling with backoff ---
  useEffect(() => {
    if (isPaused) return;
    let delay = 15000;
    let t: any;

    const tick = async () => {
      const ok = await load();
      delay = ok ? 15000 : Math.min(delay * 2, 60000);
      t = setTimeout(tick, delay);
    };

    tick();
    return () => clearTimeout(t);
  }, [sport, threshold, isPaused]);

  // --- group by league for display (MUST stay inside component) ---
  const grouped = useMemo(() => {
    const map = new Map<string, Alert[]>();
    for (const a of alerts) {
      const key = a.league || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [alerts]);

  // --- UI ---
  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>OddsPulse — Live Alerts</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {lastUpdated && (
            <small>
              Last update: {new Date(lastUpdated).toLocaleTimeString()}
            </small>
          )}
          <button onClick={() => setPaused((p) => !p)}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      {/* controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
        <label>
          Sport:&nbsp;
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="basketball_nba">NBA</option>
            <option value="football_nfl">NFL</option>
            <option value="baseball_mlb">MLB</option>
            <option value="icehockey_nhl">NHL</option>
          </select>
        </label>

        <label>
          Threshold (¢):&nbsp;
          <input
            type="number"
            min={1}
            max={50}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ width: 72 }}
          />
        </label>

        <button onClick={() => exportCsv(alerts)} disabled={!alerts.length}>
          Export CSV
        </button>

        <small>Requests remaining: {remaining ?? "?"}</small>
      </div>

      {error && (
        <p style={{ color: "crimson" }}>Error: {error}</p>
      )}

      {alerts.length === 0 ? (
        <p>No alerts yet — polling…</p>
      ) : (
        grouped.map(([league, list]) => (
          <section key={league} style={{ marginTop: 24 }}>
            <h3>{league}</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Time</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Book</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Market</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Game</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: 8 }}>Move</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td style={{ padding: 8 }}>{new Date(a.ts).toLocaleTimeString()}</td>
                      <td style={{ padding: 8 }}>{a.book}</td>
                      <td style={{ padding: 8 }}>{a.marketType}</td>
                      <td style={{ padding: 8 }}>{a.gameId}</td>
                      <td style={{ padding: 8 }}>
                        {a.oldOdds} → {a.newOdds} ({a.deltaCents}¢)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
