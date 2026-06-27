# A3 Netlify Forms Test Report

## Summary

- Date/time: `2026-06-27T23:02:00Z`
- Production URL: `https://mosapack.netlify.app`
- Unique deploy URL: `https://6a4051e679913903c354099b--mosapack.netlify.app`
- Method: live HTML detection plus one automated URL-encoded POST test.
- Test data: `derek+mosapack-test@example.com`, `A3 Test`, `A3 production Netlify Forms test. Safe to delete.`, `codex-a3-live-test`, `A3-TEST-PROJECT`.

## Live Form Detection

`bash scripts/verify-live-exposure.sh` detected all expected live forms:

- `mosapack-waitlist`: detected on `/`
- `mosapack-save-design`: detected on `/builder/`
- `mosapack-contact`: detected on `/contact/`

Each detected form includes Netlify form markup and hidden `form-name` input in live HTML. No raw file/photo upload input is present in a Netlify form.

## Submission Results

- `mosapack-waitlist`: automated POST to `https://mosapack.netlify.app/` using `application/x-www-form-urlencoded`; response status `404` with the clean site 404 page.
- `mosapack-save-design`: not submitted after the waitlist POST failed and Netlify API reported no registered forms.
- `mosapack-contact`: not submitted after the waitlist POST failed and Netlify API reported no registered forms.

## Netlify Registration Check

Netlify CLI API check:

```bash
/Users/dereksolas/.npm-global/bin/netlify api listSiteForms --data '{"site_id":"..."}'
```

Result: `[]`

This means Codex could not verify any submissions in the Netlify Forms dashboard. The live HTML contains the forms, but the Netlify site has not registered them for capture.

## Manual Check Required

Derek should check:

Netlify dashboard -> Site `mosapack` -> Forms

Expected forms after the capture issue is fixed:

- `mosapack-waitlist`
- `mosapack-save-design`
- `mosapack-contact`

## Definition Of Done

A3 is complete only when:

`3/3 live forms captured end-to-end in Netlify Forms dashboard.`

## Current A3 Status

A3 failed. Fix Netlify Forms capture/registration before A4 analytics instrumentation.
