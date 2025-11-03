// app/api/alerts/debug/route.ts
import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const result = await sql`
      SELECT *
      FROM alerts_log
      ORDER BY ts DESC
      LIMIT 50;
    `;

    // 👇 VERY important: @vercel/postgres returns { rows: [...] }
    const rows = result.rows;

    return NextResponse.json({ ok: true, rows });
  } catch (err: any) {
    console.error("ALERTS_DEBUG_ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "debug failed" },
      { status: 500 }
    );
  }
}
