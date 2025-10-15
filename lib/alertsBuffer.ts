// lib/alertsBuffer.ts
import type { Alert } from "./oddsProvider";

let RING_BUFFER: Alert[] = [];

export function pushAlerts(newOnes: Alert[]) {
  if (!newOnes?.length) return;
  RING_BUFFER = [...newOnes, ...RING_BUFFER].slice(0, 200);
}

export function getAlerts() {
  return RING_BUFFER;
}
