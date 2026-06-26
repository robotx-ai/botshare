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
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import path from "node:path";

const SRC_DIR = path.join("node_modules", ".prisma", "client");
const DEST_DIR = path.join("node_modules", "@prisma", "client", "runtime");

// Lambda (Netlify) runs on rhel; bundle both OpenSSL variants to be safe.
const WANTED = /^libquery_engine-rhel-openssl-[0-9.]+x\.so\.node$/;

if (!existsSync(SRC_DIR)) {
  console.warn(`[bundle-prisma-engines] source dir missing: ${SRC_DIR} — did 'prisma generate' run?`);
  process.exit(0);
}

mkdirSync(DEST_DIR, { recursive: true });

const engines = readdirSync(SRC_DIR).filter((f) => WANTED.test(f));
if (engines.length === 0) {
  console.warn(`[bundle-prisma-engines] no rhel engines found in ${SRC_DIR}. Present: ${readdirSync(SRC_DIR).join(", ")}`);
  process.exit(0);
}

for (const engine of engines) {
  copyFileSync(path.join(SRC_DIR, engine), path.join(DEST_DIR, engine));
  console.log(`[bundle-prisma-engines] copied ${engine} -> ${DEST_DIR}`);
}
