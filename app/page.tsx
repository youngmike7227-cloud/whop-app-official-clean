"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

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
      // hit ingest endpoint (live run)
      const res = await fetch(`/api/ingest?sport=basketball_nba&threshold=15`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data?.error || "ingest failed");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message || "request failed");
    }
  }

  async function loadRecent() {
    try {
      setError(null);
      const res = await fetch(`/api/alerts/recent?limit=200`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data?.error || "recent failed");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setLastUpdated(Date.now());
    } catch (e: any) {
      setError(e?.message || "request failed");
    }
  }

  useEffect(() => {
    // initial load -> get recent from DB so page is not empty
    loadRecent();
    // polling live every 15s unless paused
    timerRef.current = setInterval(() => {
      if (!isPaused) load();
    }, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  // Optional group by league for display
  const grouped = useMemo(() => {
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
        <h1>OddsPulse — Live & Recent Alerts</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {lastUpdated && <small>Last update: {new Date(lastUpdated).toLocaleTimeString()}</small>}
          <button onClick={() => setPaused(p => !p)}>{isPaused ? "Resume" : "Pause"}</button>
          <button onClick={load}>Live (Ingest now)</button>
          <button onClick={loadRecent}>Recent (from DB)</button>
        </div>
      </header>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {alerts.length === 0 ? (
        <p>No alerts yet — try “Live (Ingest now)” or wait for polling.</p>
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
                    <tr key={a.id + ":" + a.ts}>
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
import { Suspense } from "react";

async function getData(searchParams: { sport?: string; limit?: string }) {
  const sport = searchParams.sport ?? "basketball_nba";
  const limit = searchParams.limit ?? "100";
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/alerts/recent?sport=${encodeURIComponent(sport)}&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
}

export default async function AlertsPage({ searchParams }: { searchParams: { [k: string]: string } }) {
  const data = await getData(searchParams);
  const alerts: any[] = data.alerts ?? [];

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Recent Alerts</h1>

      <form className="mb-4">
        <input
          name="sport"
          defaultValue={searchParams.sport ?? "basketball_nba"}
          placeholder="sport (e.g., basketball_nba)"
          className="border px-2 py-1 mr-2"
        />
        <input
          name="limit"
          defaultValue={searchParams.limit ?? "100"}
          placeholder="limit"
          className="border px-2 py-1 mr-2"
        />
        <button className="border px-3 py-1">Apply</button>
      </form>

      <Suspense fallback={<div>Loading…</div>}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-2">Time</th>
              <th className="py-2 pr-2">League</th>
              <th className="py-2 pr-2">Game</th>
              <th className="py-2 pr-2">Book</th>
              <th className="py-2 pr-2">Market</th>
              <th className="py-2 pr-2">Old</th>
              <th className="py-2 pr-2">New</th>
              <th className="py-2 pr-2">Δ (cents)</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={`${a.id}-${a.ts}`} className="border-b">
                <td className="py-1 pr-2">{new Date(a.ts).toLocaleString()}</td>
                <td className="py-1 pr-2">{a.league}</td>
                <td className="py-1 pr-2">{a.gameId}</td>
                <td className="py-1 pr-2">{a.book}</td>
                <td className="py-1 pr-2">{a.marketType}</td>
                <td className="py-1 pr-2">{a.oldOdds}</td>
                <td className="py-1 pr-2">{a.newOdds}</td>
                <td className="py-1 pr-2">{a.deltaCents}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Suspense>
    </main>
  );
}
