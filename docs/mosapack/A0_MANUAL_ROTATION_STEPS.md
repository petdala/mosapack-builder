# A0 Manual Rotation Steps

Codex does not rotate provider keys or mutate external dashboards. Derek rotates provider credentials manually, then records proof in `docs/mosapack/SECURITY_ROTATION_LOG.md`.

## Current A0 State

- Clean repo scan found no client-side provider secrets.
- Builder email capture is disabled until it is rebuilt behind a server-backed endpoint.
- Builder checkout is disabled until real checkout wiring exists.
- Contact form is server-backed through Netlify Forms.
- Digital launch remains first; physical provider automation remains blocked by R&D gates.

## Kit / ConvertKit Or ESP

1. Where to rotate/revoke: Provider dashboard API key settings for the ESP account used by MosaPack.
2. What to revoke: Any API key, API secret, form token, or embed credential that was ever committed client-side or exposed in old deploys.
3. Environment variable names: `KIT_API_KEY`, `KIT_FORM_ID`, and, only if required server-side, `KIT_API_SECRET`.
4. Test old key is dead: Run a provider API request with the old value from a private local shell and confirm it returns unauthorized or forbidden. Do not paste the value into repo files or docs.
5. Test new setup works: After A3 server-backed capture exists, submit a test email through the Netlify function and confirm the ESP receives exactly one subscriber record.
6. Feature status: Email capture remains disabled until A3/D1 server-backed capture is implemented and verified.

## Stripe

1. Where to rotate/revoke: Stripe Dashboard -> Developers -> API keys, restricted keys, and webhook endpoints.
2. What to revoke: Any `sk_live`, `sk_test`, restricted key, webhook signing secret, or checkout/session credential that was exposed in old code, history, archives, or live pages.
3. Environment variable names: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MYSTERY_PET_REVEAL_PACK`, and public-only `STRIPE_PUBLISHABLE_KEY` if needed.
4. Test old key is dead: Call a harmless Stripe API endpoint with the old key from a private local shell and confirm authentication fails.
5. Test new setup works: In test mode, create a checkout session from a server-side Netlify function and verify webhook signature handling with the new webhook secret.
6. Feature status: Checkout remains disabled until real server-backed checkout is built and verified.

## Netlify

1. Where to rotate/revoke: Netlify user/team settings for personal access tokens, site build hooks, deploy keys, and site environment variables.
2. What to revoke: Any token, build hook, deploy key, or environment variable value exposed in old repo files, old history, screenshots, archives, or logs.
3. Environment variable names: Store provider values only in Netlify site/team environment variables; do not mirror values in client-side HTML or JavaScript.
4. Test old key is dead: Attempt a read-only Netlify API request with the old token from a private local shell and confirm unauthorized or forbidden.
5. Test new setup works: Confirm Netlify can build the site with only required environment variables present. Do not deploy production during A0 unless explicitly approved.
6. Feature status: Netlify hosts only the `public/` launch surface after A2 clean deploy.

## Printful / Printify

1. Where to rotate/revoke: Printful or Printify account API token settings.
2. What to revoke: Any exposed API token, store token, webhook secret, or order automation credential.
3. Environment variable names: `PRINTFUL_API_KEY`, `PRINTFUL_STORE_ID`, `PRINTIFY_API_KEY`, `PRINTIFY_SHOP_ID`, and provider webhook secrets if later used.
4. Test old key is dead: Call a harmless account endpoint with the old token from a private local shell and confirm unauthorized or forbidden.
5. Test new setup works: Do not test production order automation during A0. When physical R&D resumes, use a sandbox/test flow or read-only account endpoint first.
6. Feature status: Physical product automation remains disabled until samples, safety, assembly, shipping, and landed-margin gates pass.

## Google Analytics / Measurement Protocol

1. Where to rotate/revoke: Google Analytics Admin -> Data streams -> Measurement Protocol API secrets.
2. What to revoke: Any Measurement Protocol API secret exposed in repo files, old history, archives, logs, or live pages. Public `G-...` measurement IDs do not carry secret privileges.
3. Environment variable names: `GA_MEASUREMENT_ID` for public measurement ID if needed, and `GA_API_SECRET` only in server-side Netlify environment variables.
4. Test old key is dead: Send a Measurement Protocol validation request with the old API secret from a private local shell and confirm rejection.
5. Test new setup works: After A4 analytics is approved, send one server-side validation event and confirm it appears in debug/real-time views.
6. Feature status: No Measurement Protocol server events should be added before A4.

## Meta Pixel / Facebook

1. Where to rotate/revoke: Meta Events Manager and Business Settings for pixels and any Conversions API tokens.
2. What to revoke: Any Conversions API access token or business-system token exposed in old code, history, archives, logs, or live pages.
3. Environment variable names: Public pixel IDs can be client-side; server tokens must use a server-only name such as `META_CONVERSIONS_API_TOKEN`.
4. Test old key is dead: Call the Conversions API with the old token from a private local shell and confirm rejection.
5. Test new setup works: After analytics approval, send one test event through a server-backed endpoint and verify it in Events Manager test tools.
6. Feature status: Server-side conversion tracking remains disabled until A4.

## Other Providers

If additional provider credentials are discovered in old history or live deploys, add rows to `SECURITY_ROTATION_LOG.md` before rotating. Use server-only environment variables, prove the old key is dead, and verify the new setup without exposing values.
