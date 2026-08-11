# Повторне рев'ю Stow: фінальний стан

Дата перевірки: 2026-08-11

## Executive summary

Усі проблеми, знайдені попереднім рев'ю, виправлено. Критичних, high або незакритих medium-severity findings у перевіреному коді не залишилося. Функціональні етапи 1–6 виконані; архітектура зберігає чіткі межі `client -> API route -> service -> repository/infrastructure`, а авторизація додатково підкріплена PostgreSQL RLS і приватним Storage bucket.

Код готовий до production deployment. Перед публічним запуском залишаються операційні кроки поза репозиторієм: production Supabase/Vercel конфігурація, секрети, домен/email delivery, monitoring і перевірка CSP reports на фактичному домені.

## Відповідність етапам

| Етап | Статус | Реалізація |
|---|---|---|
| 1. Auth і protected area | Виконано | register/login/logout, confirm callback, server-side auth у кожному protected API |
| 2. List/upload/finalize/download | Виконано | signed upload, server-side size/signature validation, private bucket, 60-second signed download |
| 3. Delete | Виконано | owner-only tombstone та retryable cleanup |
| 4. Share/revoke | Виконано | neutral pending-share flow, автоматична активація після реєстрації, owner-only revoke, RLS для grantee |
| 5. Maintenance | Виконано | Bearer auth, leases, bounded concurrency, stale file та rate-counter cleanup, Vercel cron |
| 6. Tests і CI | Виконано | unit, lint, typecheck, build, DB lint, dependency audit і Chromium E2E |

## Виправлені findings

### SEC-001 — CSRF fail-open — ВИПРАВЛЕНО

**Місце:** `src/server/core/http/require-same-origin.ts:11-35`; `src/client/shared/api/api-client.ts:20-38`.

Cookie-authenticated mutations тепер fail closed: сервер вимагає точний `Origin` або точний same-origin `Referer` fallback, відхиляє `Sec-Fetch-Site: cross-site` і додатково вимагає `X-Stow-Request`. Client API adapter автоматично додає marker до POST/PUT/PATCH/DELETE-подібних запитів. Unit і E2E тести покривають missing origin, missing marker та foreign origin.

### SEC-002 — Відсутні CSP/security headers — ВИПРАВЛЕНО

**Місце:** `src/proxy.ts:10-25`; `src/config/security-headers.ts:1-46`; `next.config.ts:3-13`.

Proxy створює unpredictable nonce для кожного request і передає nonce-based CSP у Next.js render pipeline. Production policy не містить `unsafe-inline` або `unsafe-eval`; development додає лише потрібні Next.js allowances. Глобально встановлюються `X-Content-Type-Options`, clickjacking protection, `Referrer-Policy`, `Permissions-Policy` і `Cross-Origin-Opener-Policy`.

### SEC-003 — Немає rate limits і upload quotas — ВИПРАВЛЕНО

**Місце:** `src/server/core/abuse/enforce-api-rate-limit.ts:30-68`; `src/server/core/abuse/rate-limit.repository.ts:11-39`; `supabase/migrations/202608110009_add_abuse_controls.sql:13-201`; `src/server/modules/uploads/finalize-upload.service.ts:70-77`.

Додано distributed fixed-window counters у PostgreSQL для HMAC user/IP subjects, `429` з `Retry-After` та щоденне очищення старих counters. Upload reservation атомарно обмежений п'ятьма pending uploads і 1 GiB reserved/stored data на owner. Finalize вимагає точного збігу фактичного та declared size, тому quota не обходиться через неправдиву metadata.

### SEC-004 — Email enumeration через share — ВИПРАВЛЕНО

**Місце:** `src/server/modules/files/share-file.service.ts:31-42`; `src/server/modules/files/share.repository.ts:13-92`; `supabase/migrations/202608110010_add_pending_file_shares.sql:1-220`.

POST share повертає однакове `{ accepted: true }` незалежно від registration state. `file_share_requests` однаково відображає registered і pending recipients; після реєстрації адреси trigger активує реальний `file_shares` grant. Revoke транзакційно видаляє request і grant. Rate limiting додатково обмежує probing.

### PERF-001 — Подвійний `getClaims()` у layout/page — ВИПРАВЛЕНО

**Місце:** `src/server/core/auth/require-user.ts:13-26`; `src/app/(protected)/layout.tsx:11`; `src/app/(protected)/files/page.tsx:21`.

`getCurrentUser` обгорнуто в React `cache()`, тому повторні виклики в межах одного Server Component request дедуплікуються без shared cross-user cache.

## Security controls, які вже були коректними

- service-role key доступний лише в `server-only` infrastructure;
- кожний protected route повторно перевіряє auth, а owner operations перевіряють ownership server-side;
- metadata і Storage захищені RLS; bucket приватний;
- UUID object paths генеруються сервером, user filename не використовується як storage path;
- upload має extension/MIME allowlist, максимальний розмір і content signature detection;
- user-specific API responses мають `Cache-Control: private, no-store`;
- cron secret перевіряється через `timingSafeEqual`;
- JSON body має content-type validation і ліміт 16 KiB;
- client/server API responses валідовуються Zod contracts;
- SQL functions з `security definer` мають порожній `search_path`, а execute відкликаний у `public`, `anon` та `authenticated`.

## Автоматизоване негативне покриття

- unauthenticated requests до всіх protected API;
- mutation без provenance marker/origin та з foreign origin;
- прямі delete/share/revoke спроби від grantee;
- oversized metadata та MIME/signature mismatch;
- точні байти downloaded file;
- pending share до реєстрації та автоматична activation;
- atomic database rate limit, pending quota і storage quota;
- security headers на app shell;
- unauthorized/authorized maintenance sweep і cleanup invariants.

## Verification

- `npm test`: 18 test files, 59/59 tests passed;
- `npm run lint`: passed без warnings;
- `npm run typecheck`: passed;
- `npm run build`: production build passed на Next.js 16.3.0;
- `npx supabase db lint --local`: schema errors не знайдено;
- `npm run test:e2e`: 6/6 Chromium tests passed;
- `npm audit --json`: 0 відомих vulnerabilities серед 579 dependencies.

`npm audit` є point-in-time перевіркою. CI тепер повторює high-severity dependency audit, але advisories і platform configuration однаково потребують регулярного operational monitoring.
