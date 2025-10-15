import { NextResponse } from "next/server";
import { fetchLatestRawOdds, diffToAlerts } from "@/lib/oddsProvider";

let RING_BUFFER: any[] = [];

export async function GET() {
  try {
    const raw = await fetchLatestRawOdds();
    const alerts = diffToAlerts(raw, 10);
    if (alerts.length) {
      RING_BUFFER = [...alerts, ...RING_BUFFER].slice(0, 200);
    }
    return NextResponse.json({ ok: true, added: alerts.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export function getBuffer() {
  return RING_BUFFER;
}
