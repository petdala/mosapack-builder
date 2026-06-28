# B1.5/B1.6 Production Deploy Checklist

Preview approved for review:

```text
https://6a417891ca97689b8ff5819c--mosapack.netlify.app
```

## Required Manual Checks Before Production

- Open `/`.
- Open `/builder/`.
- Upload one non-private disposable test image or a known QA-safe image.
- Generate preview.
- Confirm `Request My Custom Proof` is visible after preview.
- Open proof modal.
- Confirm no raw image/file upload field exists.
- Submit one proof request only if Derek wants another live production form test.
- Verify Netlify dashboard -> Forms receives the preview test already submitted:
  - `derek+mosapack-b16-preview-test@example.com`

## Production Deploy Command

Do not run until Derek explicitly approves production:

```bash
/Users/dereksolas/.npm-global/bin/netlify deploy --dir=public --no-build --prod
```

## Post-Deploy Checks

Run:

```bash
bash scripts/verify-live-exposure.sh
bash scripts/verify-b1-5-proof-path.sh
```

Then manually verify:

- Production `/builder/` proof CTA is visible after preview.
- One live proof request can be submitted through the real UI path.
- Netlify dashboard -> Forms receives the production proof request.

## Rollback Warning

Do not roll back to any deploy that exposes old builders, dashboards, archive files, hidden proof-path regressions, or checkout-like fake success states.

## Production Deploy Completed

Date: 2026-06-28T19:53:12Z

Command used:

```bash
/Users/dereksolas/.npm-global/bin/netlify deploy --dir=public --no-build --prod
```

Production URL:

```text
https://mosapack.netlify.app
```

Unique deploy URL:

```text
https://6a417b2cc419d8d5989a7893--mosapack.netlify.app
```

Post-deploy verification:

- `bash scripts/verify-live-exposure.sh` passed.
- Required production routes returned 200.
- Old builders/dashboards remained 404.
- One production proof request smoke test returned HTTP 200.

Production proof request test:

- Email: `derek+mosapack-b16-prod-test@example.com`
- UI confirmation: `Proof request saved. We'll follow up with the next step to confirm your approved design.`

Manual follow-up:

- Derek should verify the production test appears in Netlify dashboard -> Forms.
