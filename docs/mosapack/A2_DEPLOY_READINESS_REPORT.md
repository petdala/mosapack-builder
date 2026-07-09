# A2 Deploy Readiness Report

## Repo

- Repo path: `/Users/dereksolas/Developer/mosapack-clean`
- Branch: `release/a2-clean-netlify-deploy`
- Latest commit: branch tip containing this report (`git log -1 --oneline`)
- Publish directory: `public`

## Required Public Routes

- `/`
- `/builder/`
- `/legal/privacy.html`
- `/legal/terms.html`
- `/legal/returns.html`
- `/contact/`
- `/404.html`

## Forbidden Old Routes

These must return 404 or a safe redirect after production deploy:

- `/core/builder-pro-v6.html`
- `/core/builder-pro-v7.html`
- `/core/builder-optimized-v8.html`
- `/ceo-dashboard.html`
- `/dashboards-index.html`
- `/mosapack_financial_dashboard.html`
- `/mosapack_affiliate_dashboard.html`
- `/mosapack_email_automation_flows.html`

## Forms Detected

- `mosapack-waitlist` in `public/index.html`
- `mosapack-save-design` in `public/builder/index.html`
- `mosapack-contact` in `public/contact/index.html`

All forms use Netlify Forms attributes and hidden `form-name` inputs. No Netlify form uploads raw customer photos.

## Checkout Status

Checkout remains disabled. The public builder copy says checkout is temporarily disabled while launch access is finalized, and no order/payment success state is exposed.

## Clean Repo Verification Results

Last local verification before this report:

- `bash scripts/security-scan.sh`: passed
- `bash scripts/verify-clean-repo.sh`: passed
- `bash scripts/verify-netlify-forms.sh`: passed
- Public old-provider/fake-success scan: no public blocking hits

## Deploy Method Options

Preview deploy:

```bash
netlify deploy --dir=public
```

Production deploy after Derek approval only:

```bash
netlify deploy --dir=public --prod
```

If the Netlify site is not linked, run:

```bash
netlify link
```

## Production Deploy Stop Condition

Do not run production deploy unless Derek explicitly says: `deploy production now`.

Do not roll back to any deploy that serves exposed old builder/dashboard files.

## Post-Deploy Verification Checklist

Required public routes to verify:

- `/`
- `/builder/`
- `/legal/privacy.html`
- `/legal/terms.html`
- `/legal/returns.html`
- `/contact/`
- `/404.html`

Old routes that must return 404 or safe redirect:

- `/core/builder-pro-v6.html`
- `/core/builder-pro-v7.html`
- `/core/builder-optimized-v8.html`
- `/ceo-dashboard.html`
- `/dashboards-index.html`
- `/mosapack_financial_dashboard.html`
- `/mosapack_affiliate_dashboard.html`
- `/mosapack_email_automation_flows.html`

Forms to test in the Netlify dashboard after safe labeled submissions:

- `mosapack-waitlist`
- `mosapack-save-design`
- `mosapack-contact`

Verification command after production deploy:

```bash
bash scripts/verify-live-exposure.sh
```

## A2 Production Verification Update

- Date/time: `2026-06-27T23:02:00Z`
- Production URL: `https://mosapack.netlify.app`
- Unique deploy URL: `https://6a4051e679913903c354099b--mosapack.netlify.app`
- Previous verifier failure: `scripts/verify-live-exposure.sh` used a broad case-insensitive `NETLIFY` pattern, which incorrectly flagged required Netlify Forms markup such as `data-netlify="true"` and the public Netlify Forms submission error string.
- Verifier fix summary: removed the broad `NETLIFY` match, added specific Netlify secret/deploy-hook patterns, split required and forbidden route checks, and added live HTML detection for the three Netlify Forms.
- Required route status: `/`, `/builder/`, `/contact/`, `/legal/privacy.html`, `/legal/terms.html`, `/legal/returns.html`, and `/404.html` returned `200`.
- Forbidden route status: old builder/dashboard routes returned `404`.
- Live exposure result: `bash scripts/verify-live-exposure.sh` exited `0`; no burned key ending `4cCw`, old provider references, dashboard pages, or forbidden builder versions were found in fetched live HTML.
- Netlify Forms live detection result: live HTML contains `mosapack-waitlist`, `mosapack-save-design`, and `mosapack-contact` with Netlify form attributes and hidden `form-name` inputs.
- A2 complete: yes for clean production deploy, route cleanup, exposure scan, and live form markup detection. A3 capture is tracked separately.

Manual Netlify settings still required:

- Base directory: blank / repo root
- Build command: blank
- Publish directory: `public`
