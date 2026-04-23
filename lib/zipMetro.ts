import zipToMetroData from "@/data/zip-to-metro.json";
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

const METRO_VALUES: Record<Metro, string> = {
  SF: "sf",
  LA: "la",
  VEGAS: "vegas",
  DALLAS: "dallas",
  NYC: "nyc",
  MIAMI: "miami",
};

type ZipDataMap = Record<string, ZipData>;
type MetroBboxMap = Record<Metro, [number, number, number, number]>;

const ZIP_TO_METRO = zipToMetroData as ZipDataMap;
const METRO_BBOX = metroBboxData as MetroBboxMap;

const METRO_CENTROIDS: Record<Metro, [number, number]> = (() => {
  const sums: Record<Metro, { lat: number; lng: number; n: number }> = {
    SF: { lat: 0, lng: 0, n: 0 },
    LA: { lat: 0, lng: 0, n: 0 },
    VEGAS: { lat: 0, lng: 0, n: 0 },
    DALLAS: { lat: 0, lng: 0, n: 0 },
    NYC: { lat: 0, lng: 0, n: 0 },
    MIAMI: { lat: 0, lng: 0, n: 0 },
  };
  for (const { metro, lat, lng } of Object.values(ZIP_TO_METRO)) {
    const s = sums[metro];
    s.lat += lat;
    s.lng += lng;
    s.n += 1;
  }
  const out = {} as Record<Metro, [number, number]>;
  for (const m of Object.keys(sums) as Metro[]) {
    const s = sums[m];
    out[m] = s.n > 0 ? [s.lat / s.n, s.lng / s.n] : [0, 0];
  }
  return out;
})();

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

export function getMetroLabel(metro: Metro): string {
  return METRO_LABELS[metro];
}

export function getMetroValue(metro: Metro): string {
  return METRO_VALUES[metro];
}

export function getMetroBbox(
  metro: Metro
): [number, number, number, number] | null {
  return METRO_BBOX[metro] ?? null;
}

export function getMetroCentroid(metro: Metro): [number, number] {
  return METRO_CENTROIDS[metro];
}

export function isMetro(value: string): value is Metro {
  return value in METRO_LABELS;
}

export function listMetros(): Metro[] {
  return Object.keys(METRO_LABELS) as Metro[];
}
