# B2 Implementation Plan: Exact Design Save

Source of truth: `docs/mosapack/B2_EXACT_DESIGN_SAVE_SPEC.md`

## Objective

Save the exact approved design so proof requests are fulfillable. B1.6 proves that users can upload, crop, generate a free preview, and request a proof through a metadata-only form. B2 must connect that proof intent to a retrievable design record.

## Must Save

- `project_id`
- original image or secure image asset reference
- cropped source/render
- crop state
- output grid size
- selected format
- palette/settings
- generated mosaic output or deterministic pixel/color map
- preview PNG or render snapshot
- BOM/color summary if available
- user email
- `photo_category`
- timestamp
- consent/photo-retention flag

## Must Not

- Send raw photo through Netlify Forms.
- Expose public image URLs without token/access control.
- Save client-side credentials.
- Imply checkout, fulfillment, production, or instant proof review before D1/C gates.
- Add Stripe, Shopify, supplier APIs, Wobrick, public quality scores, or hard email gate before preview.

## Recommended Architecture Options

### Option A: Netlify Function + Netlify Blobs

Use Netlify Functions as the server boundary and Netlify Blobs as site-scoped object storage.

Flow:

1. Browser generates preview locally.
2. User clicks `Request My Custom Proof`.
3. Browser asks for consent/photo-retention acknowledgement before image/design save.
4. Browser posts exact design payload to `/.netlify/functions/save-project`.
5. Function validates size/type/schema and creates or confirms `project_id`.
6. Function stores image/render/project JSON in Netlify Blobs.
7. Function returns `project_id` and non-public retrieval metadata.
8. Proof request form submits metadata only and includes the saved `project_id`.
9. Derek retrieves project by `project_id` using an internal function or manual authenticated path.

Why this is recommended pre-launch:

- MosaPack is already deployed on Netlify.
- No database migration is required for B2.
- Blobs support JSON/binary object storage and metadata.
- Keeps package/deploy complexity low if limited to `@netlify/blobs` and serverless functions.

Concerns:

- Requires adding a package/dependency unless using a Netlify runtime that already provides it.
- Admin retrieval must not be public-by-guessable URL.
- Retention/deletion operations need explicit policy and tooling.

### Option B: Supabase Storage/Database

Use Supabase private storage for images/renders and a database table for project metadata.

Advantages:

- Stronger structured query model.
- Clear future path for admin UI, status, audit logs, and customer records.
- Useful if MosaPack soon needs accounts, order state, or richer operations.

Concerns:

- Adds platform, credentials, RLS policy, and operational complexity.
- Larger security surface before launch.
- More setup than needed for a concierge proof workflow.

### Option C: Manual Upload Fallback

Keep B1.6 proof intent and have Derek request the exact image/design manually after form submission.

Advantages:

- Fastest operational fallback.
- No storage implementation required.

Concerns:

- Does not satisfy B2 exact design save.
- Cannot reliably reproduce the approved preview.
- Should only be used if B2 storage work is deferred under a concierge limitation.

## Recommended Pre-Launch Path

Use Option A: Netlify Function + Netlify Blobs, provided package/deploy complexity remains low.

Proposed stores:

- `mosapack-projects`: project JSON and metadata.
- `mosapack-project-assets`: image/render blobs, keyed by `project_id` prefix.

Suggested key pattern:

```text
projects/{project_id}/project.json
projects/{project_id}/source-or-crop.jpg
projects/{project_id}/preview.png
projects/{project_id}/mosaic-map.json
projects/{project_id}/bom.json
```

## Endpoint Ideas

### `/.netlify/functions/save-project`

Purpose: create or update the exact design record.

Input:

- `project_id` optional; function can generate if absent.
- image/render payload or upload-safe encoded payload.
- crop state.
- grid size.
- selected format.
- palette/settings.
- mosaic map or deterministic output data.
- preview PNG/render snapshot.
- BOM/color summary.
- user email.
- `photo_category`.
- consent/photo-retention flag.

Output:

- `project_id`
- save status
- created timestamp
- retrieval status for proof workflow

### `/.netlify/functions/get-project`

Purpose: retrieve saved design by `project_id` for Derek/internal proof review.

Requirements:

- Must not expose raw project data publicly by guessable ID alone.
- Require an internal access token, Netlify Identity/admin gate, or another access-control mechanism.
- Return enough data to reproduce the exact mosaic visually.

### `/.netlify/functions/delete-project`

Purpose: support deletion request path and retention policy.

Requirements:

- Delete project JSON and all asset blobs under the `project_id` prefix.
- Record deletion status where appropriate.

## Privacy Requirements

Before B2 collects images or saved renders:

- Update privacy policy to describe image/design storage.
- State retention period.
- State deletion request path.
- Add consent/photo-retention acknowledgement before saving image/design assets.
- Keep raw images out of Netlify Forms.
- Do not expose public image URLs without token/access control.

## B2 Acceptance Criteria

- After preview, save-project stores the exact design.
- Proof request references saved `project_id`.
- Derek can retrieve the saved design by `project_id` through a controlled path.
- Saved design can reproduce the same mosaic visually.
- B1.6 proof request still works.
- No raw image goes through Netlify Forms.
- Security scan passes.
- Live exposure passes.
- Privacy policy and deletion path are updated before collecting production images.

## Implementation Sequence

1. Confirm B2 storage decisions and retention policy.
2. Update privacy/returns/contact copy as needed for stored images and deletion requests.
3. Add `save-project` Netlify Function with schema validation and size limits.
4. Add Blobs storage write path for project JSON and assets.
5. Add client save call after preview/proof intent, behind explicit consent.
6. Include returned `project_id` in the existing metadata-only proof request.
7. Add `get-project` controlled retrieval path for Derek.
8. Add deletion support or documented manual deletion procedure.
9. Add browser-level B2 verification script.
10. Rerun B1.6/B2 QA and live exposure checks.

## B2 Open Questions

- Use Netlify Blobs or Supabase?
- Store original image or cropped rendered image only?
- Retention period: 30, 60, or 90 days?
- Require consent checkbox before image save?
- Should proof request save only after user clicks Request Proof?
- Max upload file size?
- Image compression dimensions?
- Admin retrieval UI now or CSV/link only?
- Should `project_id` be generated client-side before save or only server-side?
- Should B2 support delete-by-email immediately, or start with a manual support path?

## B2 Implementation Status - 2026-06-28

Implemented on branch `feature/b2-exact-design-save` using Option A: Netlify Functions + Netlify Blobs.

Built pieces:

- `netlify/functions/save-project.mjs`
- `netlify/functions/get-project.mjs`
- `netlify/functions/delete-project.mjs`
- `@netlify/blobs` dependency
- proof modal consent checkbox
- client-side cropped source and preview compression
- metadata-only Netlify Forms submission after successful design save
- `scripts/verify-b2-design-save.sh`
- admin retrieval/deletion runbook

Current behavior:

1. The free preview remains local and ungated.
2. Proof/save capture happens only after the user opens the proof/save form and gives consent.
3. The saved design uses a server-generated `project_id`.
4. Netlify Forms receives the returned `project_id` and save metadata only.
5. Raw image data is posted to `save-project`, not to Netlify Forms.

Remaining setup before production B2 deploy:

- Configure `MOSA_ADMIN_TOKEN` in Netlify.
- Preview-test `save-project` with the real UI path.
- Verify `get-project` using the admin token.
- Verify `delete-project` on a test project.
- Confirm Netlify Forms contains `project_id`, `project_saved=true`, `save_version=b2-v1`, and `design_storage=netlify_blobs`.

## B2 Preview Test Status - 2026-06-28

Preview deploy `https://6a41a625f430d406693410b6--mosapack.netlify.app` passed the real UI proof-save path:

- `save-project` returned HTTP 200.
- UI success appeared only after save and form submission.
- Netlify Forms metadata included the returned `project_id`.
- Netlify Forms payload did not include image data.

Blocked before production:

- `MOSA_ADMIN_TOKEN` is not configured on Netlify.
- `get-project` currently returns disabled status.
- Admin retrieval and deletion must be verified before production deploy.
