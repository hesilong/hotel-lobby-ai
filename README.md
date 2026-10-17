# Hotel Lobby AI

Standalone Hotel Lobby AI video generator for **hotel-lobby-ai.pro**.

## Stack
- TanStack Start + React
- TanStack Router / Query-ready
- Supabase Auth + Postgres + RLS
- Cloudflare Workers
- Cloudflare R2 for user/template/generated media
- KIE / Kling 3 Omni through an isolated provider adapter

## Local setup
1. `cp .env.example .env.local`
2. Fill local/test variables and secrets in `.env.local`.
3. Run `supabase/migrations/0001_initial.sql` in the Supabase SQL editor.
4. `npm install`
5. `npm run dev`

## Production environment

Production deployment intentionally does not reuse `.env.local`.

- `.env.production.vars` contains regular production variables.
- `.env.production.secrets` contains production secrets.
- Both real files are gitignored.
- `.env.production.vars.example` and `.env.production.secrets.example` are the required-production checklists committed to Git.
- If a variable is intentionally optional or has a runtime fallback, remove it from the corresponding `.example` checklist. It may still be present in the real file when you want to configure it.

Create the real files from the examples, fill the values, then run:

```bash
npm run env:check:prod
npm run deploy:prod
```

`npm run deploy` uses the same safe production deployment path. Deployment stops before build when a required production value is missing. Secret values are never printed by the checker.

## Architecture decisions
- The UI reuses the proven Hotel Lobby flow from ClothMotion, but not its AppContext, Studio, task system, or credit service.
- Preview reference videos and provider source videos are intentionally separate.
- Templates live in Supabase long-term; the three current ClothMotion template URLs are bootstrapped in `src/config/hotel-lobby.ts` only for the initial migration.
- Auth is requested at generation time rather than blocking the landing page.
- `src/server/generation.ts` owns task creation; provider submission should be queued and kept out of the client.
