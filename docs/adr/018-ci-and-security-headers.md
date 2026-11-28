# ADR-018: Continuous integration and security headers

- Status: Accepted
- Date: 2026-11-28

## Context

The readiness register listed two gaps: no CI pipeline was configured, and the web app was served with no Content-Security-Policy. Its only security headers were `X-Content-Type-Options`, `Referrer-Policy` and `X-Frame-Options`. `npm audit` also reported a high-severity issue in `zod`, a dependency the app does not use.

## Decision

1. **CI** (`.github/workflows/ci.yml`) runs on every pull request and every push to `main`. It has four jobs:
   - **app:** type-check, lint, production build, CSP check, unit tests, and `npm audit --omit=dev --audit-level=high`.
   - **database:** every migration and SQL suite on PostgreSQL, from a fresh database and from the legacy fixture.
   - **functions:** Edge Function tests (Deno) and Flood Intelligence pipeline tests (Python).
   - **e2e:** the browser suites against the production build, with PostgREST, the local stand-ins and Chromium.

   CI deploys nothing.
2. **Security headers** in `vercel.json`:
   - **Every path:** `Strict-Transport-Security` (2 years, subdomains), `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` (for Google sign-in), and the earlier three headers.
   - **App routes, `/index.html` and the prerendered policy pages:** a strict Content-Security-Policy.
     - Scripts come only from the site itself and Google sign-in. The one inline boot script is allowed by its SHA-256 hash. `'unsafe-inline'` and `'unsafe-eval'` are not allowed for scripts.
     - Connections go only to Supabase (`https://*.supabase.co`, `wss://*.supabase.co`) and Google sign-in.
     - Frames come only from YouTube's privacy-enhanced player, UP NOAH and Google sign-in.
     - `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, `upgrade-insecure-requests`.
     - `img-src` allows any https source, for map tiles and satellite images.
   - **Standalone legacy pages (`/*.html` at the root):** a looser policy that keeps their CDN scripts working while blocking plugins, framing by other sites and base-tag hijacking. These pages remain a known gap: they should be moved into the app or hardened.
3. **The policy is tested two ways:**
   - `scripts/check_csp.mjs` (part of `npm run check`) checks that every inline script in the built HTML is allowed by hash, and that the policy keeps its key directives.
   - `scripts/test_e2e.sh` serves the build with the production policy (`scripts/csp_for_tests.mjs` swaps only the local test origins in), so every browser suite runs under it. `e2e/csp.mjs` then visits each main screen and fails on any violation. Screens covered include Dashboard with the NOAH frame, Detection with the satellite loop, all modules and the policy pages.
4. **Dependencies:**
   - `zod` and `@hookform/resolvers` (unused) are removed.
   - `fast-xml-parser` is upgraded to 5.12.1, both in the app and in the CAP parser of the Edge Functions. The CAP tests on real PAGASA documents still pass.
   - Two moderate advisories in `react-router` 6 remain. Fixing them needs React Router 7, a separate migration.

## Consequences

- **Changing the boot script in `index.html`** fails `npm run check` until its new hash is added to `vercel.json`. The check prints the hash to add.
- **Using a custom Supabase domain** means adding it to `connect-src`.
- **New third-party content** (a frame, script or API) needs a policy change, and the browser test catches anything missed.
