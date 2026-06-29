# B2 Exact Design Save Implementation Report

Date: 2026-06-28T22:49:41Z
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Branch: `feature/b2-exact-design-save`

## Purpose

B2 bridges the production B1.6 proof request path to a retrievable exact design record. After a user generates a free preview and requests or saves a proof, MosaPack now saves the approved cropped source, generated preview, crop state, render settings, and project JSON before submitting the metadata-only Netlify Form.

## Architecture

- Frontend: existing static `public/builder/index.html`.
- Backend: Netlify Functions in `netlify/functions/`.
- Storage: Netlify Blobs via `@netlify/blobs`.
- Project JSON store: `mosapack-projects`.
- Asset store: `mosapack-project-assets`.
- Save version: `b2-v1`.

## Functions Added

| Function | Purpose | Access |
| --- | --- | --- |
| `save-project.mjs` | Saves exact design payload, creates server-side `project_id`, stores project JSON and image assets | Public POST from approved site origins |
| `get-project.mjs` | Retrieves project JSON and image assets by `project_id` | Requires `x-mosa-admin-token` matching `MOSA_ADMIN_TOKEN` |
| `delete-project.mjs` | Deletes project JSON and image assets by `project_id` | Requires `x-mosa-admin-token` matching `MOSA_ADMIN_TOKEN` |

## Blobs Key Pattern

```text
mosapack-projects/projects/{project_id}/project.json
mosapack-project-assets/projects/{project_id}/cropped-source.jpg
mosapack-project-assets/projects/{project_id}/preview.png
```

## Client Flow

1. User uploads a photo and generates the free preview.
2. User opens `Request My Custom Proof` or save-design flow.
3. User must check the temporary design storage consent checkbox.
4. Builder compresses and captures:
   - approved cropped source image as JPEG
   - rendered mosaic preview as PNG
   - crop state
   - render settings
   - grid size
   - palette, color counts, tile map, and BOM summary where available
5. Builder posts JSON to `/.netlify/functions/save-project`.
6. Function validates consent, metadata, image MIME, and image size.
7. Function generates server-side `project_id` and stores the design.
8. Builder writes returned metadata into hidden Netlify Form fields:
   - `project_id`
   - `project_saved=true`
   - `save_version=b2-v1`
   - `design_storage=netlify_blobs`
9. Builder submits the existing Netlify Form metadata-only payload.
10. UI success appears only after both project save and form submission succeed.

## Consent Behavior

The proof modal now requires this checkbox before saving image/design data:

```text
I agree that MosaPack may temporarily store this design and preview image to review my custom proof.
```

If consent is not checked, the proof/save submit stops before calling `save-project`.

## Privacy Updates

`public/legal/privacy.html` now includes `Custom Proof Design Storage` language explaining:

- free preview processing remains local unless proof/save is requested
- proof save stores metadata, approved cropped source, and generated preview
- raw images are not submitted through Netlify Forms
- full original images are not stored by default
- intended retention is 30 days unless the request becomes active
- deletion requests can be made through contact/email

## Validation and Limits

`save-project` rejects:

- non-POST requests
- non-JSON payloads
- missing consent
- missing required metadata
- unsupported `save_version`
- oversized JSON payloads over approximately 6 MB
- image data URLs over 3 MB each
- unsupported image MIME types, including SVG
- disallowed origins when an origin header is present

## Admin Retrieval

`get-project` returns project JSON and image data URLs only when called with a valid `x-mosa-admin-token` header. The token must be configured in Netlify as `MOSA_ADMIN_TOKEN`. No admin token is present in client-side code.

## Deletion Path

`delete-project` deletes the project JSON and stored image assets for a `project_id` when called with the same admin token. This supports manual privacy deletion requests until a fuller admin workflow exists.

## Limitations

- No public admin UI was added.
- No checkout, supplier automation, dashboard, or physical fulfillment flow was added.
- Automatic 30-day deletion is not implemented yet; retention is documented as policy plus manual deletion path.
- Admin retrieval requires `MOSA_ADMIN_TOKEN` to be configured before it can work on preview/production.
- Full original images are not stored by default; only the approved cropped source and preview are saved.

## Test Plan

Required checks before B2 production deploy:

- `bash scripts/security-scan.sh`
- `bash scripts/verify-clean-repo.sh`
- `bash scripts/verify-netlify-forms.sh`
- `bash scripts/verify-b1-crop-control.sh`
- `bash scripts/verify-b1-3-visual-cx.sh`
- `bash scripts/verify-b1-4-brand-architecture.sh`
- `bash scripts/verify-b1-5-proof-path.sh`
- `bash scripts/verify-b2-design-save.sh`
- `bash scripts/verify-live-exposure.sh`

Preview proof-save test must confirm:

- save-project returns `ok: true`
- Netlify Form submission succeeds after save
- form metadata contains `project_id`
- Netlify Forms payload contains no image data
- admin retrieval works if `MOSA_ADMIN_TOKEN` is configured

## Manual Setup Required

Set `MOSA_ADMIN_TOKEN` in Netlify before relying on admin retrieval or deletion. Use a long random value and keep it out of client-side files and docs.

## Preview Deploy Test - 2026-06-28

Preview deploy:

```text
https://6a41a625f430d406693410b6--mosapack.netlify.app
```

Function logs:

```text
https://app.netlify.com/projects/mosapack/logs/functions?scope=deploy:6a41a625f430d406693410b6
```

Preview proof-save test result:

- Browser path: upload -> crop -> generate preview -> request proof -> consent -> submit.
- `save-project` HTTP status: 200.
- UI success: yes.
- Saved preview test project id: `aa305cd8-48b9-4400-899b-67a492827c52`.
- Netlify Forms metadata contained the same `project_id`: yes.
- Netlify Forms metadata contained `project_saved=true`: yes.
- Netlify Forms metadata contained `save_version=b2-v1`: yes.
- Netlify Forms metadata contained `design_storage=netlify_blobs`: yes.
- Netlify Forms payload contained image data: no.

Admin retrieval status:

- `get-project` returned `500` with `Admin retrieval is disabled until MOSA_ADMIN_TOKEN is configured.`
- Production deploy is not recommended until `MOSA_ADMIN_TOKEN` is configured and the preview project above is retrieved and deleted successfully.

## Preview Admin Retrieval/Delete Verification - 2026-06-29

Preview deploy verified on the linked `mosapack` Netlify site:

```text
https://6a41e8b286ae41af51bc41af--mosapack.netlify.app
```

Fresh preview proof-save test:

- Email: `derek+mosapack-b2-admin-preview-test@example.com`
- Project id: `82e7335e-644c-4dd8-88a3-dd64e5fde5e8`
- `save-project` status: 200
- UI success: yes
- Netlify Forms metadata included matching `project_id`: yes
- Netlify Forms metadata included `project_saved=true`: yes
- Netlify Forms metadata included `save_version=b2-v1`: yes
- Netlify Forms metadata included `design_storage=netlify_blobs`: yes
- Netlify Forms payload contained image data: no

Admin retrieval:

- `get-project` returned `ok: true`.
- Project JSON was retrievable.
- Preview asset was retrievable.
- Cropped source asset was retrievable.
- Token was supplied only via shell environment/clipboard path and was not stored in the repo.

Admin deletion:

- `delete-project` returned `ok: true` and `deleted: true`.
- Follow-up `get-project` returned 404 `Project not found.`

Production deploy was approved only after preview save/get/delete passed and the full local verification gate passed.

## Production Verification - 2026-06-29

B2 was production-deployed with functions after preview admin retrieval/delete and local verification passed.

Production URL:

```text
https://mosapack.netlify.app
```

Unique deploy URL:

```text
https://6a41e979bcfb3fab104b656e--mosapack.netlify.app
```

Production proof-save project id:

```text
b5dea1c9-e20b-42c5-94ea-b75ca50e45df
```

Verified:

- Production `save-project` returned 200.
- UI showed proof request success after save and form submission.
- Netlify Forms metadata included matching `project_id`.
- Netlify Forms metadata contained no image data.
- Production `get-project` returned project JSON plus preview/cropped source assets.
- Production `delete-project` returned `ok: true` and `deleted: true`.
- The admin token was not printed, stored in docs/config, or committed.

B2 production status: complete for exact design save, admin retrieval, and manual deletion path.

## Admin Token Rotation Verification - 2026-06-29

The admin token was rotated after exposure risk and verified against production. The token itself was not stored in the repo.

Verified after rotation:

- Production functions were mounted.
- `get-project` returned `ok: true` for the rotation test project.
- Project JSON, preview asset, and cropped source asset were retrievable.
- `delete-project` returned `ok: true` and `deleted: true`.

B2 remains complete from the exact design save, retrieval, and deletion gate perspective.
