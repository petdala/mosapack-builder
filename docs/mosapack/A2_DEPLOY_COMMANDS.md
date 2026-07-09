# A2 Deploy Commands

Do not run production deploy unless Derek explicitly says `deploy now`.

## Check Link Status

```bash
cd /Users/dereksolas/Developer/mosapack-clean
netlify status
```

If the site is not linked:

```bash
netlify link
```

## Preview Deploy

```bash
cd /Users/dereksolas/Developer/mosapack-clean
netlify deploy --dir=public
```

## Production Deploy

Only after Derek explicitly approves production deploy:

```bash
cd /Users/dereksolas/Developer/mosapack-clean
netlify deploy --dir=public --prod
```

## Post-Deploy Verification

```bash
cd /Users/dereksolas/Developer/mosapack-clean
bash scripts/security-scan.sh
bash scripts/verify-clean-repo.sh
bash scripts/verify-netlify-forms.sh
bash scripts/verify-live-exposure.sh
```

Expected after production deploy:

- `/`, `/builder/`, `/legal/privacy.html`, `/legal/terms.html`, `/legal/returns.html`, `/contact/`, and `/404.html` work.
- Old `/core/*` builders and dashboard files return 404.
- No live page exposes the burned Kit/ConvertKit-style key ending in `4cCw`.
