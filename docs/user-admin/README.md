# User Admin — local dev tool

A small **local-only** UI for listing and deleting users straight against the
database. Use it to clean up test accounts.

## Run

```bash
node docs/user-admin/server.js
# → open http://127.0.0.1:4500
```

Pick the users, click **Delete selected**, type `DELETE` to confirm.

## How it stays safe

- **No credentials in any file here.** `server.js` reads `DATABASE_URL` from the
  gitignored `.env` at runtime; `index.html` contains no secrets.
- **Loopback only.** The server binds to `127.0.0.1`, so it is not reachable from
  the network. It is not a deployed endpoint.
- **Refuses `NODE_ENV=production`.**
- Even though this lives under `docs/`, if `docs/` is ever published as static
  files, only `index.html` would be served — and on its own it can do nothing,
  because it just calls `http://localhost`.

## What delete does

Deleting a user **cascades** (Prisma `onDelete: Cascade`) to that user's
`Listing`, `Reservation`, and `UserFavorite` rows. The table shows each user's
listing and booking counts before you delete — there is **no undo**.

## Config

- `USER_ADMIN_PORT` — override the default port `4500`.
