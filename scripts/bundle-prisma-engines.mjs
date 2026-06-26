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
 * FAIL-SAFE: if the rhel-openssl-3.0.x engine (the one the Netlify Lambda needs)
 * is absent after `prisma generate`, this EXITS NON-ZERO to fail the build. That
 * stops a broken, engine-less function from auto-publishing to prod and silently
 * breaking every DB query (login etc.). See CLAUDE.md "Deployment Gotchas".
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SRC_DIR = path.join("node_modules", ".prisma", "client");
const DEST_DIR = path.join("node_modules", "@prisma", "client", "runtime");

// Lambda (Netlify) runs on rhel; bundle both OpenSSL variants to be safe.
const WANTED = /^libquery_engine-rhel-openssl-[0-9.]+x\.so\.node$/;
// The Netlify nodejs20.x Lambda specifically needs this one at runtime.
const REQUIRED = "libquery_engine-rhel-openssl-3.0.x.so.node";

function fail(msg) {
  console.error(`\n[bundle-prisma-engines] BUILD HALTED: ${msg}`);
  console.error(
    "[bundle-prisma-engines] The rhel Prisma query engine is missing, so the deployed " +
      "function would throw on every DB query. Re-run `prisma generate` with the engine " +
      "available, or deploy via `npm run deploy:prod` (local build). See CLAUDE.md.\n"
  );
  process.exit(1);
}

if (!existsSync(SRC_DIR)) {
  fail(`source dir missing: ${SRC_DIR} — 'prisma generate' did not produce a client.`);
}

const present = readdirSync(SRC_DIR);
const engines = present.filter((f) => WANTED.test(f));
if (!engines.includes(REQUIRED)) {
  fail(`required engine '${REQUIRED}' not found in ${SRC_DIR}. Present: ${present.join(", ")}`);
}

mkdirSync(DEST_DIR, { recursive: true });
for (const engine of engines) {
  copyFileSync(path.join(SRC_DIR, engine), path.join(DEST_DIR, engine));
  console.log(`[bundle-prisma-engines] copied ${engine} -> ${DEST_DIR}`);
}
console.log(`[bundle-prisma-engines] OK — rhel engines present and staged for bundling.`);
