/* eslint-disable no-console */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config();

const SHEET_TO_SCENARIO_ID = {
  Party: "party",
  Exhibition: "exhibition",
  Salesman: "salesman",
  "Show room guide": "showroom-guide",
  Show: "show",
  Reception: "reception",
  "Live streaming": "live-stream",
  School: "school",
  Security: "security",
  Athlete: "athlete",
  Retail: "retail",
  Cleaning: "cleaning",
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    updateJson: true,
    updateSupabase: true,
    cloudinaryPrefix: "agibot/scenarios",
    xlsxPath: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--skip-json") args.updateJson = false;
    else if (token === "--skip-supabase") args.updateSupabase = false;
    else if (token === "--xlsx") args.xlsxPath = argv[i + 1];
    else if (token === "--cloudinary-prefix") args.cloudinaryPrefix = argv[i + 1];

    if (
      token === "--xlsx" ||
      token === "--cloudinary-prefix"
    ) {
      i += 1;
    }
  }

  return args;
}

function resolveWorkbookPath(explicitPath) {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const candidates = [
    path.resolve("Scenario and pricing.xlsx"),
    path.resolve("docs/Scenario and pricing.xlsx"),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `Workbook not found. Tried: ${candidates.join(", ")}`
    );
  }

  return found;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function extractWorkbookImages(xlsxPath, outDir) {
  const script = `
import json
import os
import sys
import zipfile
import xml.etree.ElementTree as ET

xlsx_path = sys.argv[1]
out_dir = sys.argv[2]
sheet_to_id = json.loads(sys.argv[3])

z = zipfile.ZipFile(xlsx_path)

ns_main = {'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))

rid_to_sheet = {}
for rel in rels:
    t = rel.attrib.get('Type', '')
    if t.endswith('/worksheet'):
        rid_to_sheet[rel.attrib['Id']] = 'xl/' + rel.attrib['Target']

result = {}
for sheet in wb.find('x:sheets', ns_main):
    name = sheet.attrib['name']
    if name == 'All service':
        continue
    scenario_id = sheet_to_id.get(name)
    if not scenario_id:
        continue

    rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
    sheet_xml = rid_to_sheet.get(rid)
    if not sheet_xml:
        continue

    sheet_rels_path = 'xl/worksheets/_rels/' + os.path.basename(sheet_xml) + '.rels'
    if sheet_rels_path not in z.namelist():
        continue

    sheet_rels = ET.fromstring(z.read(sheet_rels_path))
    drawing_target = None
    for rel in sheet_rels:
        if rel.attrib.get('Type', '').endswith('/drawing'):
            drawing_target = rel.attrib.get('Target')
            break

    if not drawing_target:
        continue

    drawing_xml = 'xl/' + drawing_target.replace('../', '')
    drawing_rels_path = 'xl/drawings/_rels/' + os.path.basename(drawing_xml) + '.rels'
    if drawing_rels_path not in z.namelist():
        continue

    drawing_rels = ET.fromstring(z.read(drawing_rels_path))
    image_target = None
    for rel in drawing_rels:
        if '/image' in rel.attrib.get('Type', ''):
            image_target = rel.attrib.get('Target')
            break

    if not image_target:
        continue

    image_name = os.path.basename(image_target)
    image_zip_path = 'xl/media/' + image_name
    if image_zip_path not in z.namelist():
        continue

    out_path = os.path.join(out_dir, scenario_id + '.png')
    with open(out_path, 'wb') as f:
        f.write(z.read(image_zip_path))
    result[scenario_id] = out_path

print(json.dumps(result))
`;

  const out = spawnSync(
    "python3",
    [ "-", xlsxPath, outDir, JSON.stringify(SHEET_TO_SCENARIO_ID) ],
    {
      input: script,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  if (out.status !== 0) {
    throw new Error(
      `Failed to extract workbook images: ${out.stderr || out.stdout}`
    );
  }

  const mapping = JSON.parse(out.stdout.trim() || "{}");
  return mapping;
}

async function uploadToCloudinary(localImagePath, publicId) {
  const cloud = requireEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");

  const endpoint = `https://api.cloudinary.com/v1_1/${cloud}/image/upload`;
  const fileBuffer = fs.readFileSync(localImagePath);
  const form = new FormData();
  form.append("file", new Blob([fileBuffer]), path.basename(localImagePath));
  form.append("public_id", publicId);
  form.append("overwrite", "true");

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed (${publicId}): ${text}`);
  }

  const payload = await res.json();
  return payload.secure_url;
}

function cloudinaryDeliveryUrl(publicId) {
  const cloud = requireEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
  return `https://res.cloudinary.com/${cloud}/image/upload/q_auto,f_auto/${publicId}`;
}

function loadScenarioJson() {
  const jsonPath = path.resolve("data/agibot-scenarios.json");
  const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  return { jsonPath, parsed };
}

function updateScenarioJson(scenarios, urlById) {
  let updates = 0;
  const next = scenarios.map((scenario) => {
    const nextImage = urlById[scenario.id];
    if (!nextImage || scenario.imageSrc === nextImage) {
      return scenario;
    }
    updates += 1;
    return {
      ...scenario,
      imageSrc: nextImage,
    };
  });
  return { next, updates };
}

async function updateSupabaseListings(urlById, dryRun) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL fallback)."
    );
  }
  const serviceRole = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const { parsed: scenarios } = loadScenarioJson();
  const titleToScenarioId = new Map(
    scenarios.map((s) => [`AGIBot ${s.title}`, s.id])
  );

  let touched = 0;
  for (const [title, scenarioId] of titleToScenarioId.entries()) {
    const nextUrl = urlById[scenarioId];
    if (!nextUrl) {
      continue;
    }

    const endpoint = new URL(`${supabaseUrl}/rest/v1/Listing`);
    endpoint.searchParams.set("title", `eq.${title}`);
    endpoint.searchParams.set("select", "id,title,imageSrc");

    const readRes = await fetch(endpoint, {
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });

    if (!readRes.ok) {
      throw new Error(
        `Supabase read failed for "${title}": ${await readRes.text()}`
      );
    }

    const rows = await readRes.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      console.log(`SUPABASE: no listing found for ${title}`);
      continue;
    }

    for (const row of rows) {
      if (row.imageSrc === nextUrl) {
        console.log(`SUPABASE: already synced ${title}`);
        continue;
      }

      touched += 1;
      if (dryRun) {
        console.log(`SUPABASE DRY: would update ${title}`);
        continue;
      }

      const patchUrl = new URL(`${supabaseUrl}/rest/v1/Listing`);
      patchUrl.searchParams.set("id", `eq.${row.id}`);
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          apikey: serviceRole,
          Authorization: `Bearer ${serviceRole}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          imageSrc: nextUrl,
        }),
      });

      if (!patchRes.ok) {
        throw new Error(
          `Supabase update failed for "${title}": ${await patchRes.text()}`
        );
      }
      console.log(`SUPABASE: updated ${title}`);
    }
  }

  return touched;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const xlsxPath = resolveWorkbookPath(args.xlsxPath);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scenario-thumbs-"));

  console.log(`Workbook: ${xlsxPath}`);
  console.log(`Mode: ${args.dryRun ? "dry-run" : "apply"}`);

  const localImagesById = extractWorkbookImages(xlsxPath, tmpDir);
  const ids = Object.keys(localImagesById).sort();
  const expectedIds = Object.values(SHEET_TO_SCENARIO_ID).sort();
  const missingIds = expectedIds.filter((id) => !ids.includes(id));
  if (missingIds.length > 0) {
    throw new Error(
      `Missing extracted scenario images for: ${missingIds.join(", ")}`
    );
  }
  console.log(`Extracted scenario images: ${ids.join(", ")}`);

  const cloudinaryUrlById = {};
  for (const scenarioId of ids) {
    const publicId = `${args.cloudinaryPrefix}/${scenarioId}`;
    if (args.dryRun) {
      cloudinaryUrlById[scenarioId] = cloudinaryDeliveryUrl(publicId);
      console.log(`CLOUDINARY DRY: would upload ${publicId}`);
      continue;
    }

    await uploadToCloudinary(
      localImagesById[scenarioId],
      publicId
    );
    cloudinaryUrlById[scenarioId] = cloudinaryDeliveryUrl(publicId);
    console.log(`CLOUDINARY: uploaded ${publicId}`);
  }

  if (args.updateJson) {
    const { jsonPath, parsed } = loadScenarioJson();
    const { next, updates } = updateScenarioJson(parsed, cloudinaryUrlById);
    if (args.dryRun) {
      console.log(`JSON DRY: would update ${updates} scenario imageSrc fields`);
    } else {
      fs.writeFileSync(jsonPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
      console.log(`JSON: updated ${updates} scenario imageSrc fields`);
    }
  } else {
    console.log("JSON: skipped");
  }

  if (args.updateSupabase) {
    const touched = await updateSupabaseListings(cloudinaryUrlById, args.dryRun);
    console.log(
      `SUPABASE ${args.dryRun ? "DRY" : "APPLY"}: ${touched} listing row(s) ${
        args.dryRun ? "would change" : "changed"
      }`
    );
  } else {
    console.log("SUPABASE: skipped");
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
