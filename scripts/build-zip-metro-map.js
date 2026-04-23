#!/usr/bin/env node
/**
 * One-shot generator. Fetches US Census 2023 Gazetteer ZCTA centroids +
 * 2020 ZCTA-to-county crosswalk, filters to 6 target CBSAs, writes:
 *   data/zip-to-metro.json  { [zip]: { metro, lat, lng } }
 *   data/metro-bbox.json    { [metro]: [minLng, minLat, maxLng, maxLat] }
 *
 * Re-run whenever Census updates. Commit the output JSON.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { pipeline } = require("stream/promises");
const { createWriteStream } = require("fs");
const AdmZip = require("adm-zip");

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_DIR = path.join(__dirname, ".cache");

const GAZ_ZCTA_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_zcta_national.zip";
const ZCTA_COUNTY_URL =
  "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt";

// CBSA → Metro enum. County FIPS from Census 2023 delineation file (stable set).
const METROS = {
  SF: {
    label: "San Francisco Bay Area",
    counties: ["06001", "06013", "06041", "06075", "06081"],
  },
  LA: {
    label: "Los Angeles Metro",
    counties: ["06037", "06059"],
  },
  VEGAS: {
    label: "Las Vegas Metro",
    counties: ["32003"],
  },
  DALLAS: {
    label: "Dallas\u2013Fort Worth Metro",
    counties: [
      "48085", "48113", "48121", "48139", "48221", "48231",
      "48251", "48257", "48367", "48397", "48439", "48497",
    ],
  },
  NYC: {
    label: "New York Metro",
    counties: [
      "34003", "34013", "34017", "34019", "34023", "34025", "34027",
      "34029", "34031", "34035", "34037", "34039",
      "36005", "36027", "36047", "36059", "36061", "36071",
      "36079", "36081", "36085", "36087", "36103", "36119",
      "42103",
    ],
  },
  MIAMI: {
    label: "Miami Metro",
    counties: ["12011", "12086", "12099"],
  },
};

const COUNTY_TO_METRO = {};
for (const [metro, info] of Object.entries(METROS)) {
  for (const county of info.counties) COUNTY_TO_METRO[county] = metro;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        res.resume();
        return;
      }
      pipeline(res, createWriteStream(dest)).then(resolve, reject);
    });
    req.on("error", reject);
  });
}

async function ensureCached(url, filename) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, filename);
  if (!fs.existsSync(dest) || fs.statSync(dest).size === 0) {
    console.log(`[fetch] ${url}`);
    await download(url, dest);
  }
  return dest;
}

function parseGazetteer(zipPath) {
  const zip = new AdmZip(zipPath);
  const entry = zip.getEntries().find((e) => e.entryName.endsWith(".txt"));
  if (!entry) throw new Error("No .txt in gazetteer zip");
  const text = entry.getData().toString("utf8");
  const lines = text.split(/\r?\n/);
  const header = lines[0].split("\t").map((s) => s.trim());
  const zipIdx = header.indexOf("GEOID");
  const latIdx = header.indexOf("INTPTLAT");
  const lngIdx = header.indexOf("INTPTLONG");
  if (zipIdx < 0 || latIdx < 0 || lngIdx < 0) {
    throw new Error(`Unexpected gazetteer columns: ${header.join("|")}`);
  }
  const centroids = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split("\t");
    if (row.length <= Math.max(zipIdx, latIdx, lngIdx)) continue;
    const zip = row[zipIdx].trim();
    const lat = parseFloat(row[latIdx]);
    const lng = parseFloat(row[lngIdx]);
    if (!/^\d{5}$/.test(zip) || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    centroids[zip] = { lat, lng };
  }
  return centroids;
}

function parseZctaCounty(txtPath) {
  const text = fs.readFileSync(txtPath, "utf8");
  const lines = text.split(/\r?\n/);
  const header = lines[0].split("|").map((s) => s.trim());
  const zipIdx = header.indexOf("GEOID_ZCTA5_20");
  const countyIdx = header.indexOf("GEOID_COUNTY_20");
  const areaIdx = header.indexOf("AREALAND_PART");
  if (zipIdx < 0 || countyIdx < 0 || areaIdx < 0) {
    throw new Error(`Unexpected crosswalk columns: ${header.join("|")}`);
  }
  const best = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split("|");
    if (row.length <= Math.max(zipIdx, countyIdx, areaIdx)) continue;
    const zip = row[zipIdx].trim();
    const county = row[countyIdx].trim();
    const area = parseFloat(row[areaIdx]);
    if (!/^\d{5}$/.test(zip) || !/^\d{5}$/.test(county) || Number.isNaN(area)) continue;
    if (!best[zip] || area > best[zip].area) best[zip] = { county, area };
  }
  const zipToCounty = {};
  for (const [zip, { county }] of Object.entries(best)) zipToCounty[zip] = county;
  return zipToCounty;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const gazZip = await ensureCached(GAZ_ZCTA_URL, "gaz_zcta.zip");
  const crosswalk = await ensureCached(ZCTA_COUNTY_URL, "zcta_county.txt");

  console.log("[parse] gazetteer");
  const centroids = parseGazetteer(gazZip);
  console.log(`  ${Object.keys(centroids).length} ZCTA centroids`);

  console.log("[parse] ZCTA\u2192county");
  const zipToCounty = parseZctaCounty(crosswalk);
  console.log(`  ${Object.keys(zipToCounty).length} ZCTA\u2192county rows`);

  const zipToMetro = {};
  const metroBbox = {};
  for (const metro of Object.keys(METROS)) {
    metroBbox[metro] = [Infinity, Infinity, -Infinity, -Infinity];
  }

  let matched = 0;
  for (const [zip, county] of Object.entries(zipToCounty)) {
    const metro = COUNTY_TO_METRO[county];
    if (!metro) continue;
    const c = centroids[zip];
    if (!c) continue;
    zipToMetro[zip] = { metro, lat: c.lat, lng: c.lng };
    matched++;
    const bb = metroBbox[metro];
    if (c.lng < bb[0]) bb[0] = c.lng;
    if (c.lat < bb[1]) bb[1] = c.lat;
    if (c.lng > bb[2]) bb[2] = c.lng;
    if (c.lat > bb[3]) bb[3] = c.lat;
  }

  const byMetro = {};
  for (const { metro } of Object.values(zipToMetro)) {
    byMetro[metro] = (byMetro[metro] || 0) + 1;
  }
  console.log(`[match] ${matched} zips across 6 metros`);
  for (const [m, n] of Object.entries(byMetro)) console.log(`  ${m}: ${n}`);

  const outZip = path.join(DATA_DIR, "zip-to-metro.json");
  const outBbox = path.join(DATA_DIR, "metro-bbox.json");
  fs.writeFileSync(outZip, JSON.stringify(zipToMetro) + "\n");
  fs.writeFileSync(outBbox, JSON.stringify(metroBbox, null, 2) + "\n");
  console.log(`[write] ${outZip}`);
  console.log(`[write] ${outBbox}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
