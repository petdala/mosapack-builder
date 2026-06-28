# B2 Exact Design Save Spec

## Why B2 Is Required

B1.2 captures proof-request intent, but it does not persist the exact design a customer approved. A real proof workflow needs the exact image, crop, mosaic output, and selected format to be retrievable by `project_id` before Derek can review, revise, quote, or fulfill anything.

Without B2, a proof request can identify an interested user and basic settings, but it cannot reliably reproduce the approved design.

## Current B1.2 Gap

Current B1.2 Netlify Forms capture is metadata-only. It records fields such as email, selected format, grid size, crop coordinates, focal point, timestamp, and UTM data. It does not save:

- original uploaded image
- secure source-image reference
- cropped source render
- generated mosaic output
- project JSON
- preview PNG
- color/BOM summary as retrievable data

`project_id` is currently generated client-side from a timestamp and does not map to a stored design record.

## Requirement

Before real proof fulfillment or checkout, MosaPack must persist the exact approved design server-side and make it retrievable by `project_id`.

## Data To Persist

- `project_id`
- original image reference or secure uploaded asset reference
- cropped image/rendered source
- crop state
- grid size
- selected format
- palette
- generated mosaic output
- color/BOM summary
- preview PNG or render snapshot
- timestamp
- user email
- consent/photo-retention flag

## Privacy Rules

- Do not send raw photos through Netlify Forms.
- Do not expose image URLs publicly without token or access control.
- Store source images and renders server-side with controlled access.
- Include retention language before upload/save.
- Provide a deletion request path.
- Keep proof-request metadata separate from public pages.

## Implementation Options

1. Netlify Function + Netlify Blobs
   - Browser posts approved design payload to a Netlify Function.
   - Function stores image/render/project JSON in Netlify Blobs.
   - Function returns a `project_id` and stores metadata for lookup.

2. Supabase storage/database
   - Browser posts to an API endpoint.
   - Source/render assets go to private storage.
   - Project metadata and lookup records go to database tables.

3. Manual email/upload link fallback
   - B1.2 form captures intent.
   - Follow-up email asks the user to upload/confirm the design manually.
   - Acceptable only as a temporary concierge workflow.

4. Local JSON export only
   - User downloads project JSON locally.
   - Not enough for real proof fulfillment because Derek cannot retrieve it automatically.

## Recommended Pre-Launch Option

Use Netlify Function + Netlify Blobs or equivalent server-side storage. The repo is already deployed on Netlify, Netlify Forms are working, and this keeps B2 close to the current static architecture without adding a large platform migration.

## Acceptance Criteria

- After preview, user requests proof.
- App saves the exact approved design before or during proof request.
- Derek can retrieve the design by `project_id`.
- Saved design reproduces the same mosaic byte-for-byte or visually equivalently.
- Raw photo is not sent through Netlify Forms.
- User-facing copy and privacy policy disclose retention/use.
- Deletion request path exists.
- Proof request remains unavailable for real fulfillment unless a design record exists.

## Launch Gate

B2 exact design save is required before real proof fulfillment, physical checkout, paid custom proof, or any workflow that implies Derek can immediately review the exact approved mosaic.

## B1.3 Visual CX Audit Update

B1.3 visual QA confirmed the upload/crop/preview/proof path works locally, but manual QA is still required before production approval. The visual fix moved the post-preview journey to the Formats & Proofs stage, hid advanced controls until preview generation, and kept the proof request metadata-only.

B2 exact design save remains the next true build gate before real proof fulfillment, paid custom proof, or physical checkout.
