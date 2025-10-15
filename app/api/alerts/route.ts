import { NextResponse } from "next/server";
import { getAlerts } from "../../../lib/alertsBuffer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  return NextResponse.json({ alerts: getAlerts() });
}
