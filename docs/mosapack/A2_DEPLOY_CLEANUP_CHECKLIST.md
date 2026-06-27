# A2 Deploy Cleanup Checklist

## Clean Repo

- Repo path: `/Users/dereksolas/Developer/mosapack-clean`
- Netlify publish directory: `public`
- Do not deploy production unless Derek explicitly approves.
- Do not rollback to a deploy that serves exposed credentials.

## Required Public Routes

- `/`
- `/builder/`
- `/legal/privacy.html`
- `/legal/terms.html`
- `/legal/returns.html`
- `/contact/`
- `/404.html`

## Forbidden Old Routes

These must return 404 after A2 clean deploy:

- `/core/builder-pro-v6.html`
- `/core/builder-pro-v7.html`
- `/core/builder-optimized-v8.html`
- `/ceo-dashboard.html`
- `/dashboards-index.html`
- `/mosapack_financial_dashboard.html`
- `/mosapack_affiliate_dashboard.html`
- `/mosapack_email_automation_flows.html`

## Old Live Exposure Risk

The current live deploy has served legacy builders/dashboards and a burned Kit/ConvertKit-style key ending in `4cCw`. A2 cleanup must replace the dirty deploy with the clean `public/` directory so those old files no longer resolve.

## Definition Of Done

- Clean public routes return 200.
- Forbidden old routes return 404.
- `bash scripts/security-scan.sh` passes.
- `bash scripts/verify-clean-repo.sh` passes.
- `bash scripts/verify-netlify-forms.sh` passes.
- Netlify Forms dashboard shows these forms after test submissions:
  - `mosapack-waitlist`
  - `mosapack-save-design`
  - `mosapack-contact`
- No rollback target serves exposed credentials.
