import { NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";
import { pushAlerts, getAlerts } from "../../../lib/alertsBuffer";

export async function GET() {
  try {
    const raw = await fetchLatestRawOdds();
    const alerts = diffToAlerts(raw, 5); // try 5¢ to see movement faster
    pushAlerts(alerts);

    // Return the current buffer so the client can render immediately
    return NextResponse.json({
      ok: true,
      added: alerts.length,
      alerts: getAlerts(),
    });
  } catch (e: any) {
    console.error("INGEST_ERROR", e?.message);
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
