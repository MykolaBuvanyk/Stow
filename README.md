# Stow

Private file storage built with Next.js and Supabase. Authenticated users can
upload validated PDF/JPEG/PNG files, download their files, share them with an
exact email address, revoke access, and delete files.

Share requests do not reveal whether an email is already registered. A request
for a future user stays pending and is activated automatically when that email
registers.

## Local development

Requirements: Node.js 22+, Docker, and npm.

```bash
npm ci
npx supabase start
cp .env.example .env.local
```

Fill `.env.local` with the values from `npx supabase status -o env`:

- `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`
- generate a random `CRON_SECRET` of at least 32 characters

Then run:

```bash
npm run dev
```

## Verification

```bash
npm test
npm run lint
npm run typecheck
npx supabase db lint --local
npm run test:e2e
npm run build
```

Playwright starts the Next.js development server automatically. Local Supabase
must already be running.

## Maintenance sweep

`GET /api/maintenance/sweep` accepts only
`Authorization: Bearer <CRON_SECRET>`. It atomically leases at most 50 stale
records, tombstones unfinished uploads, removes Storage objects, and then
hard-deletes the database rows. Failed records are released for retry; abandoned
leases become eligible again after 15 minutes.

Vercel invokes the endpoint daily at 03:00 UTC using [vercel.json](./vercel.json).
Set `CRON_SECRET` in the Vercel production environment so it is attached to cron
requests automatically.

The same sweep removes expired distributed rate-limit counters. Application
endpoints are rate-limited per authenticated user and, when a trusted proxy IP
is available, per IP. Upload reservations are additionally limited to five
active pending files and 1 GiB of stored/reserved data per owner.

## Security baseline

Cookie-authenticated mutations require an exact same-origin request (or an exact
same-origin Referer fallback) and the `X-Stow-Request` marker added by the client
API adapter. The app applies a nonce-based CSP, clickjacking protection,
`nosniff`, a restrictive referrer policy, and a permissions policy globally.

## CI

The GitHub Actions workflow runs unit tests, ESLint, TypeScript, a production
build, a clean local Supabase stack, database lint, and Chromium E2E tests.
