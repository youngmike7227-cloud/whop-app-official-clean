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
