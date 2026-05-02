# Railway Deployment

This app is built on TanStack Start with a Cloudflare Workers build target. On Railway it runs via **Wrangler** in production mode (Workers runtime locally inside the Railway container).

## One-time setup

1. Push this repo to GitHub (already synced via Lovable → GitHub).
2. In Railway: **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway auto-detects `nixpacks.toml` + `railway.json`.

## Required environment variables

Set these in **Railway → Variables**:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://ftbluekehigsxaokrzjj.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | (the anon key from your `.env`) |
| `VITE_SUPABASE_URL` | same as `SUPABASE_URL` (needed at build time) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same as `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | `ftbluekehigsxaokrzjj` |
| `PORT` | *(auto-injected by Railway — do not set)* |

## Port

The app listens on `$PORT` (Railway injects it automatically; falls back to `3000` locally). This is wired in the `start` script in `package.json`.

## Build & start commands

- Build: `bun install && bun run build`
- Start: `bun run start` → `wrangler dev --ip 0.0.0.0 --port $PORT`

## Generate a public domain

In Railway → **Settings → Networking → Generate Domain**.
