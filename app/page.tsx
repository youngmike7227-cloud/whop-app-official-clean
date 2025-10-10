"use client";

export default function Page() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Calculate hedge…");
  };

  return (
    <main style={{ maxWidth: 960, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>OddsPulse</h1>
        <a href="/api/whop/login">Login with Whop</a>
      </header>

      <section style={{ marginTop: 24 }}>
        <h2>Latest Alerts</h2>
        <p>Mock alerts stream (replace with real provider).</p>
        <ul>
          <li>10:12 — NBA LAL @ BOS — Moneyline at BookX moved -120 → -135</li>
          <li>10:15 — NFL NYJ @ BUF — Total 42.5 → 41.0</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Hedge Calculator</h2>
        <form onSubmit={onSubmit}>
          <div><label>Original Stake <input type="number" step="0.01" required /></label></div>
          <div><label>Original Odds (e.g., -110) <input type="text" required /></label></div>
          <div><label>Current Opposite Odds <input type="text" required /></label></div>
          <button type="submit">Calculate Hedge</button>
        </form>
      </section>
    </main>
  );
}
