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

Local development is the test environment. Once the project works locally, bootstrap the production environment directly from the keys that actually exist in `.env.local`:

```bash
npm run env:init:prod
```

This generates two gitignored files:

- `.env.production.vars` for regular production variables.
- `.env.production.secrets` for production secrets.

The initializer classifies common secret names such as `*_API_KEY`, `*_SECRET`, `*_PRIVATE_KEY`, `*_SERVICE_ROLE_KEY`, `*_ACCESS_KEY_ID`, `*_TOKEN`, and `*_PASSWORD`. Client-exposed prefixes such as `VITE_*` are always treated as regular variables.

Only variable names are copied from `.env.local`; local/test values are never copied into production files. Fill the production values manually. If a variable is optional or has a runtime fallback, simply delete that key from the generated production file.

Then run:

```bash
npm run env:check:prod
npm run deploy:prod
```

The checker treats every key remaining in the two production files as required and blocks deployment when any value is empty. Secret values are never printed.

The initializer refuses to overwrite existing production files. If you intentionally need to regenerate them from the current `.env.local`, use:

```bash
npm run env:init:prod -- --force
```

`npm run deploy` uses the same safe production deployment path.

## Architecture decisions
- The UI reuses the proven Hotel Lobby flow from ClothMotion, but not its AppContext, Studio, task system, or credit service.
- Preview reference videos and provider source videos are intentionally separate.
- Templates live in Supabase long-term; the three current ClothMotion template URLs are bootstrapped in `src/config/hotel-lobby.ts` only for the initial migration.
- Auth is requested at generation time rather than blocking the landing page.
- `src/server/generation.ts` owns task creation; provider submission should be queued and kept out of the client.
