/* eslint-disable */
/**
 * Local-only user admin tool.
 *
 * A tiny http server that reads DATABASE_URL from .env at runtime, serves the
 * UI in index.html, and deletes User rows via Prisma. It binds to 127.0.0.1
 * ONLY, so it is not reachable from the network — it is a developer convenience,
 * not a deployed endpoint.
 *
 *   node docs/user-admin/server.js
 *   → open http://127.0.0.1:4500
 *
 * Safety:
 *  - No credentials are stored in this file or in index.html. The DB connection
 *    string is read from .env (gitignored) at runtime.
 *  - Refuses to run with NODE_ENV=production.
 *  - Binds to loopback only.
 *  - Deleting a user cascades to their listings/reservations/favorites (FK
 *    onDelete: Cascade), so the UI shows those counts before you confirm.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run in production. This is a local dev tool only.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not found in .env — cannot connect.");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const HOST = "127.0.0.1";
const PORT = Number(process.env.USER_ADMIN_PORT) || 4500;

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      userType: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { listings: true, reservations: true, favoriteListings: true } },
    },
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      const html = fs.readFileSync(path.join(__dirname, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "GET" && req.url === "/api/users") {
      return json(res, 200, { users: await listUsers() });
    }

    if (req.method === "POST" && req.url === "/api/delete") {
      const body = await readBody(req);
      const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
      if (body.confirm !== "DELETE") {
        return json(res, 400, { error: "Confirmation phrase missing." });
      }
      if (ids.length === 0) {
        return json(res, 400, { error: "No user ids provided." });
      }
      const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
      console.log(`Deleted ${result.count} user(s): ${ids.join(", ")}`);
      return json(res, 200, { deleted: result.count });
    }

    json(res, 404, { error: "Not found" });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: String(err?.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`User admin tool running at http://${HOST}:${PORT}`);
  console.log("Loopback only. Ctrl+C to stop.");
});
