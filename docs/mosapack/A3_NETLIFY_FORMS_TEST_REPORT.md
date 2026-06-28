# A3 Netlify Forms Test Report

## Summary

- Date/time: `2026-06-28T02:24:54Z`
- Production URL: `https://mosapack.netlify.app`
- Unique deploy URL: `https://6a40854b093995a0683b1965--mosapack.netlify.app`
- Method: live HTML detection, Netlify API form registration check, and one automated URL-encoded POST test per form.
- Test data: `derek+mosapack-test@example.com`, `A3 Test`, `A3 production Netlify Forms test. Safe to delete.`, `codex-a3-live-test`, `A3-TEST-PROJECT`.

## Netlify Site Configuration

Netlify is connected to the clean repository:

- Repository: `petdala/mosapack-clean`
- Production branch: `release/a2-clean-netlify-deploy`
- Publish directory: `public`
- Build command: blank
- Base directory: blank / repo root
- Published commit: `30e701d4f838588584b16102df7751c5208a50bd`

## Live Form Detection

`bash scripts/verify-live-exposure.sh` detects all expected live forms:

- `mosapack-waitlist`: detected on `/`
- `mosapack-save-design`: detected on `/builder/`
- `mosapack-contact`: detected on `/contact/`

Netlify post-processes served form HTML after registration, so the live verifier checks for the rendered form name and hidden `form-name` input. Source markup still keeps Netlify form attributes and is covered by `bash scripts/verify-netlify-forms.sh`.

## Submission Results

- `mosapack-waitlist`: automated POST to `https://mosapack.netlify.app/` using `application/x-www-form-urlencoded`; response status `200`.
- `mosapack-save-design`: automated POST to `https://mosapack.netlify.app/builder/` using `application/x-www-form-urlencoded`; response status `200`.
- `mosapack-contact`: automated POST to `https://mosapack.netlify.app/contact/` using `application/x-www-form-urlencoded`; response status `200`.

## Netlify Registration Check

Netlify CLI API check:

```bash
/Users/dereksolas/.npm-global/bin/netlify api listSiteForms --data '{"site_id":"..."}'
```

Registered forms and submission counts:

- `mosapack-waitlist`: `submission_count: 1`, `last_submission_at: 2026-06-28T02:24:54.300+00:00`
- `mosapack-contact`: `submission_count: 1`, `last_submission_at: 2026-06-28T02:24:54.398+00:00`
- `mosapack-save-design`: `submission_count: 1`, `last_submission_at: 2026-06-28T02:24:54.423+00:00`

## Manual Check Recommended

Derek can confirm the submissions in:

Netlify dashboard -> Site `mosapack` -> Forms

Expected forms:

- `mosapack-waitlist`
- `mosapack-save-design`
- `mosapack-contact`

## Definition Of Done

A3 is complete when:

`3/3 live forms captured end-to-end in Netlify Forms dashboard.`

## Current A3 Status

A3 passed. All three live forms are registered in Netlify and accepted labeled test submissions.
