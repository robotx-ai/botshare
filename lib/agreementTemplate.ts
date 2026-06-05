import { differenceInCalendarDays } from "date-fns";

export const TEMPLATE_VERSION = "tripartite-v1";

export function formatAgreementNo(date: Date, seq: number): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const seqStr = String(seq).padStart(4, "0");
  return `TPA-${year}${month}-${seqStr}`;
}

export function termDurationDays(start: Date, end: Date): number {
  return differenceInCalendarDays(end, start);
}
