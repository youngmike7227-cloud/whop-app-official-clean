"use client";
import { useEffect, useState } from "react";

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

export default function Page() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/alerts", { cache: "no-store" });
      const data = await res.json();
      setAlerts(data.alerts || []);
    }

    // Initial load
    load();
    // Refresh every 15 seconds
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h2>📈 Latest Alerts</h2>
      {alerts.length === 0 ? (
        <p>No alerts yet — waiting for odds updates...</p>
      ) : (
        <ul>
          {alerts.map((a) => (
            <li key={a.id}>
              <strong>{new Date(a.ts).toLocaleTimeString()}</strong> — {a.league}{" "}
              ({a.marketType}) — {a.book}: {a.oldOdds} → {a.newOdds} (
              {a.deltaCents}¢)
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
