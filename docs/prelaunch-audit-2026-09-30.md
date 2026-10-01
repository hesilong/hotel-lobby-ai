# Prelaunch audit — 2026-09-30

Decision: **NO-GO for unrestricted public generation**. Read-only audit of repository and local HTTP responses; no deployment or billable generation performed.

Final recheck: a new untracked `.env.production` appeared during the audit. It also sets `MOCK_GENERATION=true`, contains server credential variables, and is **not ignored** by the current `.gitignore`. Keep server secrets out of Git, ignore sensitive environment files explicitly, and configure production Worker secrets. No credential values are included in this report. Working-tree changes occurred concurrently; observations apply to files at the time inspected.

| Priority | Check | Status | Evidence | Required action |
|---|---|---|---|---|
| Blocker | Release build | Fail | `npm run build`: Vite bundles succeed, TypeScript TS2769 at `src/server/r2Presign.ts:33`; `npm run deploy` runs this build first | Fix the Web Crypto key buffer type and rerun the full build |
| Blocker | Generation cost control | Missing in application code | `src/server/generation.ts:41,102` authenticate then submit paid jobs; no quota debit, rate limit, concurrent-job cap or idempotency guard. Credit tables exist but are unused | Enforce server-side usage budgets, rate/concurrency limits and idempotency; restrict access until verified |
| High | Real generation mode | Local environment is mock | `.env.local`: `MOCK_GENERATION=true`; mock jobs return a template URL | Explicitly configure production mode and verify a real job end to end before public launch |
| High | Upload and request validation | Incomplete | `storage.ts:46` trusts client MIME type, has no upload-size input/limit; `generation.ts:42` identity validator and partial checks do not validate all enums/types or asset ownership | Validate complete input schemas, controlled asset origins/ownership, upload sizes and stored content |
| High | Direct task inserts | Overbroad migration policy | `supabase/migrations/0001_initial.sql:66` permits inserting own rows with client-supplied task status/provider fields | Route task creation through trusted server code and tighten DB grants/policies; verify actual deployed policies |
| High | OAuth preserves work | Fails by source inspection | Inputs/files live only in `HotelLobbyWorkbench` state; Google OAuth redirects the whole page and callback replaces location with `/`; modal promises preservation | Sign in before input selection or implement safe draft persistence; test return to both entry pages |
| High | Job completion reliability | Browser-dependent | `HotelLobbyWorkbench.tsx:52` polls every 3 seconds; `generation.ts:218` persists result only on refresh requests; no independent completion worker/webhook | Add durable completion handling, recovery and idempotent persistence; test closing the browser mid-job |
| High | Privacy/contact accuracy | Incomplete | Policy cookies section only describes essential storage despite GA4; contact section refers to a support channel, but no actual address/channel was found | Describe deployed analytics accurately and publish a working contact/deletion channel; determine consent behavior for target markets |
| High | Social preview | Missing | Homepage and `/migos-ai-video` have no `og:image` | Add an absolute reachable sharing image and corresponding metadata |
| Medium | Video persistence memory | Risk | `storage.ts:79` buffers entire response before checking actual byte length; declared content length can be absent | Stream with a byte limit or otherwise bound memory usage |
| Medium | Moderation | Placeholder | `ENABLE_IMAGE_MODERATION=false`; enabling it always throws `IMAGE_MODERATION_NOT_CONFIGURED` | Decide launch moderation approach; implement adapter before enabling this switch |
| Medium | Security headers | Not present on local responses | Auditor found no CSP, Referrer-Policy or X-Content-Type-Options | Configure and verify production response headers; local evidence does not establish edge settings |
| Needs confirmation | Production origin | Unreachable from audit tools | `https://hotel-lobby-ai.pro/` connection reset; web fetch also unavailable. Wrangler file has no custom domain declaration | Verify actual deployment, DNS, Workers custom domain, TLS and HTTP-to-HTTPS behavior; dashboard configuration may exist |
| Needs confirmation | Production secrets | Not verified | Required local variables are nonempty, but no remote configuration was inspected | Set Worker runtime Supabase/KIE/R2 configuration; provide public Vite Supabase variables during build |
| Needs confirmation | Supabase | Not exercised | Migration exists with tables/RLS; remote DB/auth settings not read | Verify migration applied, Google provider, production Site URL and `/auth/callback` redirect allowlist; verify email confirmation delivery |
| Needs confirmation | R2 | Not exercised | Uses presigned browser PUT and public object URLs | Verify bucket, scoped credentials, production-origin CORS PUT/Content-Type, media domain and retention/deletion policy |
| Needs confirmation | Analytics | Code only | GA4 `G-QRGEK14KFY` mounted in production; Clarity not present | Confirm enhanced-measurement history tracking and live GA4 events. Clarity is optional and needs a project ID if desired |
| Needs confirmation | Operations | No evidence in repository | No identified alerting, backup verification or rollback procedure | Establish error/uptime alerts, provider cost alerts, backup and rollback procedures |

Verified local HTTP passes: `/`, `/migos-ai-video`, `/privacy-policy`, `/terms-of-service` return 200; titles, descriptions, canonical URLs and viewport are present; no accidental noindex on public pages; favicon and robots resolve; nonexistent page returns 404. Homepage and topic page contain parseable JSON-LD. Existing favicon is still `/favicon.svg`, not the generated PNG.

The auditor follows robots.txt to the **production** sitemap and reports it unreachable. This is not evidence that the local sitemap file is missing. The local XML contains four public URLs and must be rechecked on production.

Production dependency audit: `npm audit --omit=dev --registry=https://registry.npmjs.org --json` returned zero reported vulnerabilities. Default npmmirror registry lacks the audit endpoint; the official registry retry succeeded. This does not cover dev dependencies or prove application security.

Commands and URLs tested:

```text
npm run build
npm audit --omit=dev --registry=https://registry.npmjs.org --json
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174
python C:/Users/sweethome/.codex/skills/prelaunch-site-check/scripts/audit_url.py --url https://hotel-lobby-ai.pro --json
python C:/Users/sweethome/.codex/skills/prelaunch-site-check/scripts/audit_url.py --url http://127.0.0.1:5174/ --json
python C:/Users/sweethome/.codex/skills/prelaunch-site-check/scripts/audit_url.py --url http://127.0.0.1:5174/migos-ai-video --json
python C:/Users/sweethome/.codex/skills/prelaunch-site-check/scripts/audit_url.py --url http://127.0.0.1:5174/privacy-policy --json
python C:/Users/sweethome/.codex/skills/prelaunch-site-check/scripts/audit_url.py --url http://127.0.0.1:5174/terms-of-service --json
GET http://127.0.0.1:5174/sitemap.xml
```

Limitations: no browser surface available (`iab` unavailable; browser inventory empty), so rendered desktop/mobile interactions, console/network inspection, keyboard accessibility and performance were not verified. HTTP checks use a local dev server, not a production preview. No real login, signup, upload, paid generation, retry/download or GA4 collection verified. Remote Cloudflare/Supabase/R2 settings, moderation/provider model constraints and service quotas remain unverified. No source fixes made in this audit.
