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
2. Fill Supabase variables.
3. Run `supabase/migrations/0001_initial.sql` in the Supabase SQL editor.
4. `npm install`
5. `npm run dev`

## Architecture decisions
- The UI reuses the proven Hotel Lobby flow from ClothMotion, but not its AppContext, Studio, task system, or credit service.
- Preview reference videos and provider source videos are intentionally separate.
- Templates live in Supabase long-term; the three current ClothMotion template URLs are bootstrapped in `src/config/hotel-lobby.ts` only for the initial migration.
- Auth is requested at generation time rather than blocking the landing page.
- `src/server/generation.ts` owns task creation; provider submission should be queued and kept out of the client.
