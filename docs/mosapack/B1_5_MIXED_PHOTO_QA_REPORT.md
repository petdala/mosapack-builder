# B1.5 Mixed-Photo QA Gate Report

Date: 2026-06-28T19:13:43Z
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Branch: `feature/b1-4-brand-architecture-photo-ux`
Preview URL: `https://6a415b6952fddc66d29243b1--mosapack.netlify.app`
Production baseline: `https://mosapack.netlify.app`

## Gate Result

Status: **FAILED**

Production deploy recommendation: **Not approved; fix P0/P1 first**

B2 readiness recommendation: **Not ready; fix UX issues first**

Reason: the 20-photo set successfully uploads, crops, and generates nonblank previews, but the proof request CTA is not reachable in the rendered builder state. The CTA exists in the DOM inside `#postPreviewFlow`, but its parent `#insightsPanel` is `display:none`, so the user cannot open the proof request modal through the primary path. Mobile also fails required usability checks because horizontal overflow is present and the crop/proof path is not reachable in the tested viewport.

## Route Baseline

Preview route checks:

| URL | Result |
| --- | --- |
| `/` | 200 |
| `/builder/` | 200 |
| `/contact/` | 200 |
| `/assets/scenes/office-1920x1080.jpg` | 200 |

Production exposure baseline:

- `bash scripts/verify-live-exposure.sh` passed.
- Production still returns 404 for old builders/dashboards checked by the script.
- Live Netlify Forms detection passed.

## Test Image Set

Private folder:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

Files present:

- 20 `.jpg` files
- `manifest.csv`

Private source images were not copied into the repo and were not staged.

## 20-Photo Desktop QA

Automation path:

1. Opened local `/builder/`.
2. Uploaded image through `#fileInput`.
3. Confirmed crop editor became visible.
4. Exercised zoom, reset, and fit controls.
5. Generated preview.
6. Confirmed `#mosaicCanvas` had nonblank sampled pixels.
7. Looked for visible proof CTA and proof modal path.

Summary:

| Metric | Result |
| --- | ---: |
| Images tested | 20 |
| Upload success | 20 |
| Crop editor visible | 20 |
| Crop controls exercised | 20 |
| Nonblank preview generated | 20 |
| Visible/reachable proof CTA | 0 |
| Proof modal opened through UI | 0 |
| Full B1.5 pass | 0 |

Per-image result:

| File | Category | Upload | Crop | Preview | Unique sampled colors | Recommended format | Proof CTA reachable | Result |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `pet-01.jpg` | Pet | Pass | Pass | Pass | 11 | Magnetic Reveal Kit | Fail | Fail |
| `pet-02.jpg` | Pet | Pass | Pass | Pass | 8 | Magnetic Reveal Kit | Fail | Fail |
| `pet-03.jpg` | Pet | Pass | Pass | Pass | 13 | Magnetic Reveal Kit | Fail | Fail |
| `pet-04.jpg` | Pet | Pass | Pass | Pass | 4 | Magnetic Reveal Kit | Fail | Fail |
| `pet-05.jpg` | Pet | Pass | Pass | Pass | 14 | Magnetic Reveal Kit | Fail | Fail |
| `couple-01.jpg` | Couple/Wedding | Pass | Pass | Pass | 13 | Magnetic Reveal Kit | Fail | Fail |
| `couple-02.jpg` | Couple/Wedding | Pass | Pass | Pass | 19 | Magnetic Reveal Kit | Fail | Fail |
| `couple-03.jpg` | Couple/Wedding | Pass | Pass | Pass | 14 | Magnetic Reveal Kit | Fail | Fail |
| `family-01.jpg` | Family | Pass | Pass | Pass | 12 | Magnetic Reveal Kit | Fail | Fail |
| `family-02.jpg` | Family | Pass | Pass | Pass | 13 | Magnetic Reveal Kit | Fail | Fail |
| `family-03.jpg` | Family | Pass | Pass | Pass | 12 | Magnetic Reveal Kit | Fail | Fail |
| `memorial-01.jpg` | Memorial | Pass | Pass | Pass | 11 | Magnetic Reveal Kit | Fail | Fail |
| `memorial-02.jpg` | Memorial | Pass | Pass | Pass | 10 | Magnetic Reveal Kit | Fail | Fail |
| `memorial-03.jpg` | Memorial | Pass | Pass | Pass | 7 | Magnetic Reveal Kit | Fail | Fail |
| `baby-kids-01.jpg` | Baby/Kids | Pass | Pass | Pass | 17 | Magnetic Reveal Kit | Fail | Fail |
| `baby-kids-02.jpg` | Baby/Kids | Pass | Pass | Pass | 14 | Magnetic Reveal Kit | Fail | Fail |
| `baby-kids-03.jpg` | Baby/Kids | Pass | Pass | Pass | 12 | Magnetic Reveal Kit | Fail | Fail |
| `other-01.jpg` | Corporate/Logo | Pass | Pass | Pass | 9 | Magnetic Reveal Kit | Fail | Fail |
| `other-02.jpg` | Corporate/Logo | Pass | Pass | Pass | 11 | Magnetic Reveal Kit | Fail | Fail |
| `other-03.jpg` | Corporate/Logo | Pass | Pass | Pass | 4 | Magnetic Reveal Kit | Fail | Fail |

Interpretation:

- Upload, crop, and preview generation are not the blocker.
- Preview output appears nonblank across all categories.
- The proof request path is the blocker.
- Recommended format logic currently returns `Magnetic Reveal Kit` for every tested category, including digital/photo-agnostic cases. This reduces recommendation trust and should be treated as a P1 issue before launch.

## Mobile QA

Viewport: `390x844`

Images tested:

- `pet-01.jpg`
- `pet-03.jpg`
- `couple-01.jpg`
- `family-01.jpg`
- `memorial-01.jpg`
- `other-01.jpg`

Result: **Fail**

Observed:

- 6/6 had horizontal overflow.
- 6/6 generated a preview canvas area.
- 0/6 exposed the crop/proof path in a usable way after generation according to the automated viewport checks.
- The proof CTA remained unreachable because the proof panel path was hidden.

Mobile is not production-ready for B1.5.

## Keyboard and Focus QA

Result: **Fail**

Observed:

- `:focus-visible` exists in the CSS baseline.
- The automated keyboard path timed out before reaching/opening the proof modal because the proof CTA is not reachable through the rendered primary flow.
- No evidence of a keyboard trap was found, but the primary proof path cannot be completed.

Keyboard/focus is not production-ready for B1.5.

## Live Proof Request Test

Result: **Not submitted**

Reason: the proof request CTA is unreachable through the UI in the tested preview/local state. Submitting by directly invoking hidden form internals would not validate the customer path and would produce a misleading pass.

The Netlify form itself remains structurally safe:

- `bash scripts/verify-netlify-forms.sh` passed.
- No raw image/file input is present in the Netlify proof/save form.

## P0/P1/P2 Issues

| Priority | Issue | Evidence | Required before production |
| --- | --- | --- | --- |
| P0 | Proof request CTA is unreachable after preview. | `#postPreviewFlow` is unhidden, but its parent `#insightsPanel` is `display:none`; 20/20 tests could not open proof modal through UI. | Yes |
| P0 | Mobile primary path fails. | 6/6 mobile checks had horizontal overflow and did not expose a usable crop/proof path. | Yes |
| P1 | Recommended format always returned `Magnetic Reveal Kit`. | 20/20 categories received the same recommendation, including logo and digital/photo-agnostic cases. | Yes |
| P1 | Step/proof state is visually misleading. | Progress indicator shows `Request Proof`, but the actual request CTA is not reachable. | Yes |
| P2 | Subjective recognition still needs manual human review. | Automation verified nonblank canvas output, not emotional likeness quality. | No, but do before production if possible |

## Verification Results

| Check | Result |
| --- | --- |
| `bash scripts/security-scan.sh` | Pass; no high-confidence credential hits |
| `bash scripts/verify-clean-repo.sh` | Pass |
| `bash scripts/verify-netlify-forms.sh` | Pass |
| `bash scripts/verify-b1-crop-control.sh` | Pass |
| `bash scripts/verify-live-exposure.sh` | Pass |
| `bash scripts/verify-b1-3-visual-cx.sh` | Pass |
| `bash scripts/verify-b1-4-brand-architecture.sh` | Pass |

## Release Recommendation

Production deploy: **No**

B2 exact design save: **No**

Smallest next fix:

1. Restore a visible, primary post-preview proof CTA in the active rendered path.
2. Fix mobile horizontal overflow and make crop/generate/proof reachable at `390x844`.
3. Recheck recommendation logic so it does not force every image/category into `Magnetic Reveal Kit`.
4. Rerun B1.5 mixed-photo QA.

## B1.6 Rerun After Proof Path Fix

Date: 2026-06-28T19:40:52Z
Branch: `fix/b1-6-proof-path-mobile`
Preview URL: `https://6a417891ca97689b8ff5819c--mosapack.netlify.app`

### Root Cause

`#postPreviewFlow` was unhidden after generation, but its parent `#insightsPanel` remained `display:none`. The proof CTA existed in the DOM but was not visible, clickable, or keyboard reachable.

### Fix Applied

- Moved the single `#postPreviewFlow` into the active preview/canvas journey.
- Kept one proof CTA and one proof form state.
- Kept generated preview visible after generation.
- Added modal close button, Escape close behavior, and focus return.
- Fixed plus-address email validation for QA/live test addresses.
- Added `scripts/verify-b1-5-proof-path.sh` so hidden-parent CTA regressions fail.

### 20-Photo Rerun Result

| Metric | Result |
| --- | ---: |
| Images tested | 20 |
| Upload/crop/preview | 20 |
| Nonblank preview | 20 |
| Proof CTA reachable | 20 |
| Proof modal opened | 20 |
| Metadata-only proof payload | 20 |
| Recognizable preview automated proxy | 20 |
| Full pass | 20 |

Failed categories: none.

### Mobile Rerun Result

Viewport: `390x844`

| Metric | Result |
| --- | ---: |
| Images tested | 6 |
| Pass | 6 |
| Horizontal overflow failures | 0 |

### Keyboard/Focus Rerun Result

Result: pass.

- Tab/keyboard can reach the proof CTA.
- Enter opens the proof modal.
- Focus moves into the email field.
- Form fields and submit are keyboard reachable.
- Escape closes the modal.
- Focus returns to the proof CTA.

### Live Proof Request Preview Result

Submitted exactly one proof request through the B1.6 preview UI.

- Email: `derek+mosapack-b16-preview-test@example.com`
- HTTP response: 200
- UI response: `Proof request saved. We'll follow up with the next step to confirm your approved design.`
- No raw image/file input was submitted through Netlify Forms.

Derek should verify the submission in Netlify dashboard -> Forms.

### Remaining Issues

| Priority | Issue | Status |
| --- | --- | --- |
| P0 | Proof CTA unreachable | Fixed |
| P0 | Mobile proof path unreachable / horizontal overflow | Fixed |
| P1 | Keyboard proof modal path incomplete | Fixed |
| P2 | Format recommendation returns `Magnetic Reveal Kit` for all automated images | Deferred; proof is intent-only and checkout remains disabled |
| P2 | Human subjective likeness review | Still recommended before broad launch |

### Updated Recommendation

Production deploy: **Approved after Derek preview/forms review**

B2 exact design save: **Ready after production deploy decision**
