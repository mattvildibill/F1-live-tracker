# Vercel deployment

Production domain: https://f1.mattvildibill.com
Source: https://github.com/mattvildibill/F1-live-tracker
Production branch: `main`.

`vercel.json` records the framework, build and output settings. This repository is connected to its own Vercel project; retain that Git connection. Vercel builds each push to `main`; other branches receive previews. No manual asset copy or Sites publishing is needed. The production branch is `main`. Migration was completed on September 29, 2026; Vercel reported successful deployments for all seven repositories.

Use Node.js 24. Run `npm ci` when a lockfile is present, then `npm run build`. No application secrets or database are required. Never commit `.env` files or Vercel credentials.

The portfolio opens each application in its own browser tab. Projects own their runtimes and assets; no application runtime or city assets are loaded into the portfolio. The framing policy permits this app and the current portfolio; the obsolete legacy origin has been removed. Preserve the content-type and referrer security headers. No provider credential belongs in this browser bundle.

Production and local previews use the same built source. For a reliable portfolio entry, use `?mode=demo&panel=tower&time=120`: the demo starts paused, is labeled synthetic and makes no external data requests unless the visitor deliberately selects a network-backed panel. The base URL continues to open Live / Weekend.

Other supported view parameters are `panel`, a positive OpenF1 `session` key in Live mode, and for recorded replay `year` and `round`. A shared browsed session restores that exact session rather than returning to the automatic weekend. Invalid inputs fall back to valid defaults. Copy view link retains the paused demo time or recorded race identity. Provider restrictions remain visible rather than silently substituting synthetic data.

Run the build, lint and Node tests before release. For local browser checks, `npm run preview -- --host 127.0.0.1 --port 5183 --strictPort` serves the production output. Do not publish or change production connections as part of local verification.
