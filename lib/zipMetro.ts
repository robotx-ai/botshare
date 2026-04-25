// Server-only zip-to-metro lookup. The full 120 KB zip dataset is bundled
// here; do NOT import this module from a "use client" component. Client code
// should validate zips via GET /api/zip-check and read labels/bbox/centroids
// from lib/metro.ts instead.

import zipToMetroData from "@/data/zip-to-metro.json";
import type { Metro, ZipData } from "@/lib/metro";

export { getMetroLabel, getMetroBbox, getMetroCentroid } from "@/lib/metro";
export type { Metro, ZipData } from "@/lib/metro";

const ZIP_TO_METRO = zipToMetroData as Record<string, ZipData>;
const ZIP_RE = /^\d{5}$/;

export function getZipData(zip: string): ZipData | null {
  if (!ZIP_RE.test(zip)) return null;
  return ZIP_TO_METRO[zip] ?? null;
}

export function isServiceableZip(zip: string): boolean {
  return getZipData(zip) !== null;
}

export function getMetroForZip(zip: string): Metro | null {
  return getZipData(zip)?.metro ?? null;
}
