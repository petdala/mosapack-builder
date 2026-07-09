# Proof Request Operations Runbook

Date: 2026-06-29
Status: manual operations workflow for free proof requests.

## Trigger

A user submits a custom proof request through the builder after generating a free preview and consenting to temporary design storage.

## Where To Find The Request

Open Netlify Forms for the MosaPack site.

Form name:

```text
mosapack-save-design
```

Fields to review:

- `email`
- `name`
- `project_id`
- `project_saved`
- `request_type`
- `proof_requested`
- `photo_category`
- `selected_vertical`
- `recommended_format`
- `product_interest`
- `grid_size`
- `preview_shape`
- `crop_x`
- `crop_y`
- `crop_zoom`
- `focal_point_x`
- `focal_point_y`
- `note`

## Retrieve The Saved Design

Use the token-protected B2 admin endpoint. Do not put the token in docs, chat, source files, or screenshots.

```bash
curl -sS \
  -H "x-mosa-admin-token: <MOSA_ADMIN_TOKEN>" \
  "https://mosapack.netlify.app/.netlify/functions/get-project?project_id=<PROJECT_ID>" \
  > /tmp/mosapack-project.json
```

Inspect without dumping large image fields:

```bash
node -e '
const fs = require("fs");
const data = JSON.parse(fs.readFileSync("/tmp/mosapack-project.json", "utf8"));
console.log({
  ok: data.ok,
  project_id: data.project_id || data.project?.project_id,
  hasProjectJson: !!data.project || !!data.project_json,
  keys: Object.keys(data)
});
'
```

## Review Checklist

- Subject is recognizable in the mosaic preview.
- Crop is acceptable and subject is not awkwardly cut off.
- Photo category makes sense.
- Recommended format makes sense for the photo.
- Preview is appropriate for proof follow-up.
- No obvious offensive, unsafe, or inappropriate content.
- Photo appears suitable for at least one path: digital, sticker, magnetic, or brick quote.
- Customer note does not request a capability MosaPack cannot currently support.

## Buildable Proof Export Tools

After generating a preview, operators can open the collapsed Advanced tools section and use:

```text
Proof Export Tools
```

These tools generate local proof files for manual review:

- proof preview PNG
- optimized source PNG
- numbered grid SVG
- color legend HTML
- production JSON
- proof email image PNG

If the proof request has already been saved, the generated production JSON includes the saved `project_id`. If not, it is marked as an unsaved preview.

Do not attach or upload generated files that contain private customer imagery outside the intended proof workflow. Do not imply checkout, ordering, shipping, or production has started. Production starts only after proof approval and a paid product path is explicitly confirmed later.

## Manual Reply Templates

### 1. Looks Good / Next Step

Subject: Your MosaPack proof request

Hi <NAME>,

Thanks for sending your photo through MosaPack. Your saved mosaic preview looks suitable for a custom proof review.

Recommended next step: <RECOMMENDED_FORMAT>.

I will review the design details and follow up with the next proof step before anything is made. Production starts only after proof approval and after a paid product path is confirmed.

Thanks,
MosaPack

### 2. Need Better Photo

Subject: A better photo will help your MosaPack proof

Hi <NAME>,

Thanks for sending your photo through MosaPack. I reviewed the saved preview, and this image may not produce a clear custom proof because <REASON>.

If you can, please send a brighter or higher-resolution photo with the main subject closer to the center. A simple background and clear face/detail usually work best.

Thanks,
MosaPack

### 3. Recommend Digital Only

Subject: MosaPack proof recommendation

Hi <NAME>,

Thanks for your proof request. The saved mosaic preview looks best suited for a digital format right now. This keeps the result flexible while avoiding physical production limitations for this photo.

I can follow up with the recommended digital proof path before anything is made or delivered.

Thanks,
MosaPack

### 4. Recommend Sticker/Magnetic Proof Path

Subject: MosaPack proof recommendation

Hi <NAME>,

Thanks for your proof request. The saved preview looks like a good candidate for a sticker or magnetic proof path because the subject reads clearly at mosaic scale.

I will confirm the best format and next proof step before anything is produced.

Thanks,
MosaPack

### 5. Recommend Premium Brick Quote

Subject: MosaPack premium brick quote recommendation

Hi <NAME>,

Thanks for your proof request. Your saved mosaic preview may be a fit for a premium brick quote, depending on final size, color count, and part availability.

I will review the design details and follow up with a quote-oriented proof step before any production decision is made.

Thanks,
MosaPack

### 6. Cannot Produce / Unsuitable Photo

Subject: MosaPack proof request review

Hi <NAME>,

Thanks for trying MosaPack. I reviewed the saved preview, and this photo is not suitable for a custom proof at this time because <REASON>.

If you have another photo with clearer lighting, a centered subject, or higher resolution, you can generate a new preview and submit another proof request.

Thanks,
MosaPack

## Tracking Table

Use this table in a private spreadsheet or private notes. Do not commit customer data.

| date | email | project_id | photo_category | recommended_format | status | reply sent | likely buyer yes/no | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | customer@example.com | project-id | Pet | Magnetic Reveal Kit | new/reviewed/replied/closed | no | unknown | retrieve project |

## Deletion Request

Use the B2 delete endpoint when a user requests deletion or when cleanup is needed.

```bash
curl -sS -X POST \
  -H "content-type: application/json" \
  -H "x-mosa-admin-token: <MOSA_ADMIN_TOKEN>" \
  --data '{"project_id":"<PROJECT_ID>"}' \
  "https://mosapack.netlify.app/.netlify/functions/delete-project"
```

Record deletion in the private tracking table with the date and reason. Do not retain downloaded project JSON after deletion is complete.
