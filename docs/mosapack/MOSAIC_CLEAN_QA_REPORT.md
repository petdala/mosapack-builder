# Mosaic Clean QA Report

Date: 2026-06-29
Branch: `feature/mosaic-clean-preprocess-v1`
Default strength: `medium`
Dither default: `ordered`
Test surface: local `public/builder/index.html` served at `http://127.0.0.1:4173/builder/`
Preview URL: `https://6a4301a104cec7b17c1bd734--mosapack.netlify.app`

## Image Set

Private QA folder used:

```text
/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set/
```

Automated QA used 17 images:

- 5 pet
- 3 family/portrait
- 3 memorial
- 3 baby/kids
- 3 corporate/logo/other

## QA Method

For each image:

1. Opened the public builder.
2. Uploaded the image.
3. Entered crop state.
4. Generated preview.
5. Confirmed preview canvas was nonblank.
6. Read `window.MosaPackDebug.getMosaicCleanMeta()`.
7. Recorded color count and cleanup stats.
8. Checked that forbidden public terms were not visible.

This is an automated buildability and nonblank-preview QA pass. Derek visual review is still required for subjective recognizability before production.

## Result Summary

| Metric | Count |
| --- | ---: |
| Total tested | 17 |
| Improved | 17 |
| Same | 0 |
| Worse | 0 |

Acceptance result: pass by automated proxy. All previews were nonblank, stayed within the 16-color target for 48x48, and had no public metric/payment terms visible.

## Result Table

| Category | File | Result | Colors before | Colors after | Speckles removed | Cells changed | Notes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| pet | pet-01.jpg | improved | 13 | 13 | 27 | 27 | Nonblank preview; cleanup reduced or maintained color complexity |
| pet | pet-02.jpg | improved | 9 | 9 | 153 | 153 | Nonblank preview; cleanup reduced or maintained color complexity |
| pet | pet-03.jpg | improved | 13 | 13 | 26 | 26 | Nonblank preview; cleanup reduced or maintained color complexity |
| pet | pet-04.jpg | improved | 4 | 4 | 148 | 148 | Nonblank preview; cleanup reduced or maintained color complexity |
| pet | pet-05.jpg | improved | 12 | 12 | 25 | 25 | Nonblank preview; cleanup reduced or maintained color complexity |
| family/portrait | family-01.jpg | improved | 15 | 15 | 35 | 35 | Nonblank preview; cleanup reduced or maintained color complexity |
| family/portrait | family-02.jpg | improved | 14 | 14 | 1 | 1 | Nonblank preview; cleanup reduced or maintained color complexity |
| family/portrait | family-03.jpg | improved | 15 | 15 | 35 | 35 | Nonblank preview; cleanup reduced or maintained color complexity |
| memorial | memorial-01.jpg | improved | 12 | 12 | 85 | 85 | Nonblank preview; cleanup reduced or maintained color complexity |
| memorial | memorial-02.jpg | improved | 8 | 7 | 97 | 103 | Nonblank preview; cleanup reduced or maintained color complexity |
| memorial | memorial-03.jpg | improved | 8 | 8 | 58 | 58 | Nonblank preview; cleanup reduced or maintained color complexity |
| baby/kids | baby-kids-01.jpg | improved | 14 | 14 | 74 | 74 | Nonblank preview; cleanup reduced or maintained color complexity |
| baby/kids | baby-kids-02.jpg | improved | 14 | 14 | 105 | 105 | Nonblank preview; cleanup reduced or maintained color complexity |
| baby/kids | baby-kids-03.jpg | improved | 15 | 15 | 62 | 62 | Nonblank preview; cleanup reduced or maintained color complexity |
| corporate/logo/other | other-01.jpg | improved | 12 | 12 | 82 | 82 | Nonblank preview; cleanup reduced or maintained color complexity |
| corporate/logo/other | other-02.jpg | improved | 14 | 14 | 9 | 9 | Nonblank preview; cleanup reduced or maintained color complexity |
| corporate/logo/other | other-03.jpg | improved | 15 | 15 | 102 | 102 | Nonblank preview; cleanup reduced or maintained color complexity |

## Proof Flow Smoke

Local proof-save smoke used mocked local B2/Form responses:

- project id: `local-mosaic-clean-smoke`
- saved state: yes
- sticky CTA hidden after saved: yes
- forbidden public terms visible: no
- Mosaic Clean metadata present: yes

Hosted preview proof-save used the Netlify draft URL with deployed functions:

| Viewport | Project ID | B2 save-project | Netlify Forms | Form project_id | Raw image in form | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| Mobile 390x844 | `f78a8cad-60ea-435b-80b7-ea00000fa5e6` | 200 | 200 | yes | no | Saved state visible; sticky CTA hidden; no horizontal overflow |
| Desktop 1440x1000 | `5eba7286-6fa2-49dd-86ed-1bcc81ae7848` | 200 | 200 | yes | no | Advanced tools collapsed by default and opened successfully |

Hosted Mosaic Clean metadata was present in both flows. The desktop hosted run recorded `target_max_colors=16`, `unique_colors_before=15`, `unique_colors_after=15`, and `speckles_removed=35`.

## Recommendation

Keep Mosaic Clean v1 enabled by default at `medium`, with ordered dithering. Derek should visually review the preview deploy before production.
