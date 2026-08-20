/**
 * bundle-prisma-engines.mjs — make the Prisma query engine bundleable on Netlify.
 *
 * Prisma 4 generates the platform query engines into node_modules/.prisma/client,
 * but @netlify/plugin-nextjs does not reliably include the .so.node binary in the
 * serverless function bundle. At runtime the Lambda's Prisma Client searches
 * node_modules/@prisma/client/runtime FIRST. We copy the rhel engines there so the
 * existing netlify.toml `included_files` entry bundles them and the runtime finds them.
 *
 * Runs in `build:netlify` after `prisma generate`, before `next build`.
 *
 * WHY THE DOWNLOAD STEP: `prisma generate` only materializes a schema binaryTarget if
 * that engine is already in the local Prisma cache (~/.cache/prisma) or gets fetched by
 * the @prisma/engines postinstall. On a cold CI cache that silently yields a client with
 * only some targets — on Netlify, rhel-openssl-1.0.x but not the rhel-openssl-3.0.x the
 * nodejs20.x Lambda actually loads. Rather than depend on Prisma's fetch heuristics, we
 * fetch any missing engine straight from binaries.prisma.sh, pinned to the exact engine
 * commit this install expects (@prisma/engines-version).
 *
 * FAIL-SAFE: if the rhel-openssl-3.0.x engine is still absent after the download attempt,
 * this EXITS NON-ZERO to fail the build. That stops a broken, engine-less function from
 * publishing and silently breaking every DB query (login etc.). See CLAUDE.md
 * "Deployment Gotchas".
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const SRC_DIR = path.join("node_modules", ".prisma", "client");
const DEST_DIR = path.join("node_modules", "@prisma", "client", "runtime");

// Lambda (Netlify) runs on rhel; bundle both OpenSSL variants to be safe.
const WANTED = /^libquery_engine-rhel-openssl-[0-9.]+x\.so\.node$/;
// The Netlify nodejs20.x Lambda specifically needs this one at runtime.
const REQUIRED_TARGET = "rhel-openssl-3.0.x";
const REQUIRED = `libquery_engine-${REQUIRED_TARGET}.so.node`;

function fail(msg) {
  console.error(`\n[bundle-prisma-engines] BUILD HALTED: ${msg}`);
  console.error(
    "[bundle-prisma-engines] The rhel Prisma query engine is missing, so the deployed " +
      "function would throw on every DB query. See CLAUDE.md 'Deployment Gotchas'.\n"
  );
  process.exit(1);
}

/**
 * Fetch one query engine from the Prisma CDN, pinned to this install's engine commit,
 * and write it uncompressed into node_modules/.prisma/client.
 */
async function downloadEngine(target) {
  const { enginesVersion } = require("@prisma/engines-version");
  const url = `https://binaries.prisma.sh/all_commits/${enginesVersion}/${target}/libquery_engine.so.node.gz`;
  console.log(`[bundle-prisma-engines] ${target} missing — fetching ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    fail(`download of ${target} failed: HTTP ${res.status} from ${url}`);
  }

  const gz = Buffer.from(await res.arrayBuffer());
  const engine = gunzipSync(gz);
  const dest = path.join(SRC_DIR, `libquery_engine-${target}.so.node`);
  writeFileSync(dest, engine, { mode: 0o755 });
  console.log(
    `[bundle-prisma-engines] wrote ${dest} (${(engine.length / 1024 / 1024).toFixed(1)} MB)`
  );
}

if (!existsSync(SRC_DIR)) {
  fail(`source dir missing: ${SRC_DIR} — 'prisma generate' did not produce a client.`);
}

if (!readdirSync(SRC_DIR).includes(REQUIRED)) {
  console.log(
    `[bundle-prisma-engines] present after generate: ${readdirSync(SRC_DIR).filter((f) => WANTED.test(f)).join(", ") || "no rhel engines"}`
  );
  await downloadEngine(REQUIRED_TARGET);
}

const engines = readdirSync(SRC_DIR).filter((f) => WANTED.test(f));
if (!engines.includes(REQUIRED)) {
  fail(`required engine '${REQUIRED}' still absent from ${SRC_DIR} after download attempt.`);
}

mkdirSync(DEST_DIR, { recursive: true });
for (const engine of engines) {
  const from = path.join(SRC_DIR, engine);
  const to = path.join(DEST_DIR, engine);
  copyFileSync(from, to);
  console.log(
    `[bundle-prisma-engines] copied ${engine} (${(statSync(to).size / 1024 / 1024).toFixed(1)} MB) -> ${DEST_DIR}`
  );
}
console.log("[bundle-prisma-engines] OK — rhel engines present and staged for bundling.");
