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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    try {
      setError(null);
      const res = await fetch("/api/ingest", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "ingest failed");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message || "request failed");
    }
  }

  useEffect(() => {
    // first load
    load();
    // poll every 15s
    timerRef.current = setInterval(() => {
      if (!isPaused) load();
    }, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const grouped = useMemo(() => {
    // optional: group by league for nicer display
    const map = new Map<string, Alert[]>();
    for (const a of alerts) {
      const key = a.league || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries());
  }, [alerts]);

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>OddsPulse — Live Alerts</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {lastUpdated && (
            <small>Last update: {new Date(lastUpdated).toLocaleTimeString()}</small>
          )}
          <button onClick={() => setPaused((p) => !p)}>
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </header>

      {error && (
        <p style={{ color: "crimson" }}>Error: {error}</p>
      )}

      {alerts.length === 0 ? (
        <p>No alerts yet — polling every 15s…</p>
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
