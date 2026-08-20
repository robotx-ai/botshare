/**
 * promote-deploy.mjs — publish an already-built Netlify deploy to production.
 *
 * Auto-publishing is deliberately OFF for this site: the published deploy is kept
 * "locked", so every CI build finishes as a ready-but-unpublished deploy with its own
 * URL. That makes each push to main a preview, and makes going live an explicit act.
 * This script is that act. It publishes an existing build — it never builds — so it is
 * instant, costs no build minutes, and uploads nothing over the local network.
 *
 * Usage:
 *   node scripts/promote-deploy.mjs                 # promote newest ready production deploy
 *   node scripts/promote-deploy.mjs <deploy_id>     # promote a specific deploy
 *   node scripts/promote-deploy.mjs --dry-run       # check only, change nothing
 *   node scripts/promote-deploy.mjs --rollback      # republish the previously published deploy
 *
 * Preflight before publishing: the target must be `ready`, serve 200 on its own deploy
 * URL, and render real DB rows. That last check is the one that matters — the recurring
 * failure on this repo is a function bundled without the Prisma rhel query engine, which
 * builds and serves HTML fine but throws on every DB query. See CLAUDE.md.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const DEPLOY_URL_SUFFIX = "--hifivebot-com.netlify.app";
// A route that must hit the database. If Prisma's engine is missing this 500s.
const DB_ROUTE = "/services";
// getListings() dedupes the catalog by title; a healthy render carries many ids.
const MIN_DB_IDS = 5;

function siteId() {
  if (process.env.NETLIFY_SITE_ID) return process.env.NETLIFY_SITE_ID;
  if (existsSync(".netlify/state.json")) {
    return JSON.parse(readFileSync(".netlify/state.json", "utf8")).siteId;
  }
  throw new Error("no site id: set NETLIFY_SITE_ID or run `netlify link`");
}

/**
 * The Netlify CLI hangs behind the local proxy/VPN some machines here run, so every
 * call goes out with the proxy vars stripped.
 */
function netlifyApi(method, payload) {
  const env = { ...process.env };
  for (const k of ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]) delete env[k];
  const out = execFileSync(
    "npx",
    ["netlify", "api", method, "--data", JSON.stringify(payload)],
    { env, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }
  );
  return JSON.parse(out);
}

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  return { status: res.status, body: await res.text() };
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const rollback = args.includes("--rollback");
const explicitId = args.find((a) => !a.startsWith("--"));

const SITE = siteId();
const deploys = netlifyApi("listSiteDeploys", { site_id: SITE, per_page: 25 });
const published = deploys.find((d) => d.published_at) ?? null;

if (!published) throw new Error("no currently published deploy found — refusing to act blind");

let target;
if (rollback) {
  target = deploys.find((d) => d.id !== published.id && d.published_at && d.state === "ready");
  if (!target) throw new Error("no earlier published deploy to roll back to");
} else if (explicitId) {
  target = deploys.find((d) => d.id === explicitId);
  if (!target) throw new Error(`deploy ${explicitId} not in the last 25 deploys`);
} else {
  target = deploys.find(
    (d) => d.state === "ready" && d.context === "production" && d.id !== published.id
  );
  if (!target) throw new Error("no ready, unpublished production deploy to promote");
}

const short = (d) =>
  `${d.id}  ${d.state}  ${d.context}  ${(d.commit_ref || "no-commit").slice(0, 8)}  ${d.created_at}`;

console.log(`site:      ${SITE}`);
console.log(`published: ${short(published)}`);
console.log(`target:    ${short(target)}`);
console.log(`title:     ${(target.title || "").split("\n")[0]}`);

if (target.id === published.id) {
  console.log("\nTarget is already published. Nothing to do.");
  process.exit(0);
}
if (target.state !== "ready") {
  console.error(`\nABORT: target state is '${target.state}', not 'ready'.`);
  process.exit(1);
}

// --- preflight on the target's own URL, before it is anywhere near production ---
const base = `https://${target.id}${DEPLOY_URL_SUFFIX}`;
console.log(`\npreflight ${base}`);

const home = await get(`${base}/`);
console.log(`  /            ${home.status}`);
if (home.status !== 200) {
  console.error("ABORT: home page did not return 200.");
  process.exit(1);
}

const db = await get(`${base}${DB_ROUTE}`);
const ids = new Set(db.body.match(/\\"id\\":\\"[a-z0-9]{15,}/g) || []);
console.log(`  ${DB_ROUTE.padEnd(12)} ${db.status}  (${ids.size} db ids)`);
if (db.status !== 200 || db.body.includes("Query engine library")) {
  console.error(
    "\nABORT: DB-backed route failed. The function is very likely missing the Prisma\n" +
      "rhel query engine. Do NOT publish. See CLAUDE.md 'Deployment gotchas'."
  );
  process.exit(1);
}
if (ids.size < MIN_DB_IDS) {
  console.error(
    `\nABORT: only ${ids.size} db ids rendered (expected >= ${MIN_DB_IDS}). The page loads but\n` +
      "the database is not answering. Do NOT publish."
  );
  process.exit(1);
}

if (dryRun) {
  console.log("\n--dry-run: preflight passed, nothing changed.");
  process.exit(0);
}

// --- promote: unlock old, publish target, re-lock so auto-publishing stays off ---
console.log("\npromoting...");
netlifyApi("unlockDeploy", { deploy_id: published.id });
netlifyApi("restoreSiteDeploy", { site_id: SITE, deploy_id: target.id });
netlifyApi("lockDeploy", { deploy_id: target.id });

const site = netlifyApi("getSite", { site_id: SITE });
const now = site.published_deploy || {};
console.log(`published: ${now.id}  locked: ${now.locked}`);

if (now.id !== target.id) {
  console.error("ABORT: published deploy is not the target. Check the Netlify dashboard.");
  process.exit(1);
}
if (!now.locked) {
  console.error("WARNING: deploy is NOT locked — auto-publishing is live. Re-lock it.");
  process.exit(1);
}

const prod = await get("https://hifivebot.com/");
console.log(`\nhttps://hifivebot.com/  ${prod.status}`);
console.log(`\nrollback: npm run deploy:rollback   (returns to ${published.id})`);
