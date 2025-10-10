# App Requirements – OddsPulse

**Problem**  
Sports bettors need real-time odds movement alerts to protect their bankrolls and avoid losing expected value (EV) when lines shift suddenly.

**Target User**  
Active sports bettors who wager multiple times per week and want an edge without monitoring odds 24/7.

**Must‑Have Features (V1)**  
1) **Real-time Steam Alerts** – Instant notifications when significant line movement occurs on tracked games.  
2) **Hedge Calculator** – Quick calculator for optimal hedge size given the original bet.  
3) **Injury/News Pings** – Alerts for impactful player updates that may move lines.

**Success Metric**  
≥70% of active users engage with ≥1 alert per betting day (open/click).

**Notes for build**  
- One-screen MVP: Alerts feed + inline Hedge Calculator.  
- Auth + membership gate via Whop OAuth (server‑side check).  
- Seed alerts with mocked provider first; swap in real feed later.
