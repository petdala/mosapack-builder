# Verification

Generated: 20260720-001923

## Common Scripts

- `scripts/security-scan.sh`: exists
- `scripts/verify-clean-repo.sh`: exists
- `scripts/verify-live-exposure.sh`: exists
- `scripts/verify-netlify-forms.sh`: exists
- `scripts/verify-b2-design-save.sh`: exists
- `scripts/verify-public-builder-wizard.sh`: exists
- `scripts/verify-mosaic-clean-preprocess.sh`: exists
- `scripts/verify-mosaic-clean-category-profiles.sh`: exists
- `scripts/verify-photo-suitability-coach.sh`: not present
- `scripts/verify-detail-priority-map.sh`: not present

## Captured Output

## scripts/security-scan.sh

```text
Security scan root: /Users/dereksolas/Developer/mosapack-clean
WARNING: archive files found:
.netlify/functions/get-project.zip
.netlify/functions/save-project.zip
.netlify/functions/delete-project.zip
Public Kit/ConvertKit reference scan: no matches.
High-confidence credential scan: no matches.
Low-confidence sensitive identifier hits: 551
Docs/scripts may mention discontinued providers or scanner patterns; inspect new hits before release.
Security scan complete.
```
Result: PASS

## scripts/verify-clean-repo.sh

```text
FORBIDDEN path/name found: prototype
Netlify form file-upload check: no raw image/file uploads in Netlify forms.
Netlify Forms verification passed.
FORBIDDEN public quality score/badge language found in builder:
7:    <meta name="description" content="Upload a photo, preview your mosaic instantly, and get a free design check by email. No payment, no signup. Real supplier colors, professional ΔE00 color matching." />
MISSING proof request CTA/copy in builder.
MISSING proof request type metadata in builder form.
MISSING recommended_format metadata in builder form.
Clean repo verification failed.
```
Result: FAIL (exit 1)

## scripts/verify-live-exposure.sh

```text
Live exposure check: https://mosapack.netlify.app
Known burned Kit/ConvertKit-style key last 4 only: 4cCw
Netlify Forms markup is allowed; Netlify secrets and deploy hooks are not.
curl: (6) Could not resolve host: mosapack.netlify.app
/ -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/builder/ -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/contact/ -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/legal/privacy.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/legal/terms.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/legal/returns.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/404.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/ceo-dashboard.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/dashboards-index.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/core/builder-pro-v6.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/core/builder-pro-v7.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/core/builder-optimized-v8.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/mosapack_financial_dashboard.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/mosapack_affiliate_dashboard.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/mosapack_email_automation_flows.html -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/ form check -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/builder/ form check -> network-error
curl: (6) Could not resolve host: mosapack.netlify.app
/contact/ form check -> network-error
Live exposure check could not fetch any pages; network unavailable or DNS blocked.
```
Result: FAIL (exit 2)

## scripts/verify-netlify-forms.sh

```text
Netlify form file-upload check: no raw image/file uploads in Netlify forms.
Netlify Forms verification passed.
```
Result: PASS

## scripts/verify-b2-design-save.sh

```text
MISSING save-project client call in builder
MISSING design storage consent checkbox/copy in proof modal
MISSING Netlify form metadata field: name="project_saved"
MISSING Netlify form metadata field: name="save_version"
MISSING Netlify form metadata field: name="design_storage"
Netlify proof form image-payload check: metadata only.
FORBIDDEN public quality score/badge language found in builder:
7:    <meta name="description" content="Upload a photo, preview your mosaic instantly, and get a free design check by email. No payment, no signup. Real supplier colors, professional ΔE00 color matching." />
B2 exact design save verification failed.
```
Result: FAIL (exit 1)

## scripts/verify-public-builder-wizard.sh

```text
MISSING: public wizard headline
MISSING: 5-step visual flow label: Upload Photo
MISSING: 5-step visual flow label: Crop &amp; Position
MISSING: 5-step visual flow label: Preview Mosaic
MISSING: 5-step visual flow label: Request Proof
MISSING: 5-step visual flow label: Proof Received
MISSING: mobile sticky CTA
MISSING: crop CTA copy
MISSING: preview proof CTA copy
MISSING: proof submit CTA copy
MISSING: saved proof copy
MISSING: default recommended sticker-ready format
MISSING: compact format/size helper note
MISSING: operator tools mount
MISSING: ops-only operator tools renderer
MISSING: ops=1 query gate
MISSING: advanced tools runtime label assembly
MISSING: B2 save-project call
MISSING: design storage consent checkbox
MISSING: raw image privacy note
FORBIDDEN: public quality score terms
7:    <meta name="description" content="Upload a photo, preview your mosaic instantly, and get a free design check by email. No payment, no signup. Real supplier colors, professional ΔE00 color matching." />
Public builder wizard verification failed.
```
Result: FAIL (exit 1)

## scripts/verify-mosaic-clean-preprocess.sh

```text
MISSING: Mosaic Clean source term: applyMosaicCleanPreprocess
MISSING: Mosaic Clean source term: cleanupMappedMosaic
MISSING: Mosaic Clean source term: mosaic-clean-(v1|category-profiles-v1)
MISSING: Mosaic Clean source term: mosaicCleanMeta
MISSING: Mosaic Clean source term: settings\.mosaicClean
MISSING: Mosaic Clean source term: getMosaicCleanOptions
MISSING: Mosaic Clean source term: buildabilityCleanup
MISSING: Mosaic Clean source term: preprocess
MISSING: preserved builder contract: /\.netlify/functions/save-project
MISSING: preserved builder contract: designStorageConsent
MISSING: preserved builder contract: mosaicCanvas
MISSING: preserved builder contract: cropCanvas
MISSING: ordered dithering default
MISSING: debug metadata helper
FORBIDDEN: public quality score or internal metric terms in builder UI/source
7:    <meta name="description" content="Upload a photo, preview your mosaic instantly, and get a free design check by email. No payment, no signup. Real supplier colors, professional ΔE00 color matching." />
Mosaic Clean preprocess verification failed.
```
Result: FAIL (exit 1)

## scripts/verify-mosaic-clean-category-profiles.sh

```text
MISSING: category profile table
MISSING: profile resolver
MISSING: resolved profile helper
MISSING: upload category selector
MISSING: customer-friendly auto category option
MISSING: category selector label
MISSING: category selector helper copy
MISSING: pet profile
MISSING: medium profile strength
MISSING: memorial profile
MISSING: none dither profile
MISSING: corporate/logo profile
MISSING: category profile preprocess version
MISSING: B2 selected category metadata
MISSING: B2 resolved profile metadata
MISSING: Netlify Forms profile metadata
MISSING: Netlify Forms strength metadata
MISSING: Netlify Forms dither metadata
MISSING: Netlify Forms cleanup metadata
MISSING: save-project reference
MISSING: design storage consent checkbox
Mosaic Clean category profiles verification failed.
```
Result: FAIL (exit 1)

## scripts/verify-photo-suitability-coach.sh

Status: not present
## scripts/verify-detail-priority-map.sh

Status: not present
