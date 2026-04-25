import metroBboxData from "@/data/metro-bbox.json";

export type Metro = "SF" | "LA" | "VEGAS" | "DALLAS" | "NYC" | "MIAMI";

export interface ZipData {
  metro: Metro;
  lat: number;
  lng: number;
}

const METRO_LABELS: Record<Metro, string> = {
  SF: "San Francisco Bay Area",
  LA: "Los Angeles Metro",
  VEGAS: "Las Vegas Metro",
  DALLAS: "Dallas\u2013Fort Worth Metro",
  NYC: "New York Metro",
  MIAMI: "Miami Metro",
};

// Hardcoded centroid-of-bbox per metro. Stable across dataset regenerations
// for the current CBSA footprints. Avoids shipping the full zip dataset to
// the browser just to compute six averages.
const METRO_CENTROIDS: Record<Metro, [number, number]> = {
  SF: [37.77, -122.27],
  LA: [34.07, -118.18],
  VEGAS: [35.97, -114.89],
  DALLAS: [32.76, -96.97],
  NYC: [40.83, -73.59],
  MIAMI: [26.18, -80.41],
};

type MetroBboxMap = Record<Metro, [number, number, number, number]>;
const METRO_BBOX = metroBboxData as MetroBboxMap;

export function getMetroLabel(metro: Metro): string {
  return METRO_LABELS[metro];
}

export function getMetroBbox(
  metro: Metro
): [number, number, number, number] | null {
  return METRO_BBOX[metro] ?? null;
}

export function getMetroCentroid(metro: Metro): [number, number] {
  return METRO_CENTROIDS[metro];
}
