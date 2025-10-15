import { NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "../../../lib/oddsProvider";
import { pushAlerts } from "../../../lib/alertsBuffer";

export async function GET() {
  try {
    const raw = await fetchLatestRawOdds();
    const alerts = diffToAlerts(raw, 10);
    pushAlerts(alerts);
    return NextResponse.json({ ok: true, added: alerts.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
