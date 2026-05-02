# Railway Deployment

This app runs on Railway as a TanStack Start Node server built with Nitro.

## One-time setup

1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo** → pick this repo.
3. Railway auto-detects `nixpacks.toml` + `railway.json`.

## Required environment variables

Set these in **Railway → Variables**:

| Variable                        | Value                                                           |
| ------------------------------- | --------------------------------------------------------------- |
| `SUPABASE_URL`                  | Your Supabase project URL                                       |
| `SUPABASE_PUBLISHABLE_KEY`      | Your Supabase anon/publishable key                              |
| `VITE_SUPABASE_URL`             | same as `SUPABASE_URL` (needed at build time)                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same as `SUPABASE_PUBLISHABLE_KEY`                              |
| `VITE_SUPABASE_PROJECT_ID`      | Your Supabase project ID                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional; only needed if server admin Supabase helpers are used |
| `PORT`                          | _(auto-injected by Railway — do not set)_                       |

## Port

Railway injects `$PORT` automatically. The production server reads it from the Nitro output and falls back to `3000` locally.

## Build & start commands

- Build: `npm ci && npm run build`
- Start: `npm run start` -> `node .output/server/index.mjs`

## Generate a public domain

In Railway → **Settings → Networking → Generate Domain**.
