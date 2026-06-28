# B2 Admin Retrieval Runbook

## Required Environment Variable

Set this in Netlify Site settings -> Environment variables:

```text
MOSA_ADMIN_TOKEN
```

Use a long random value. Do not commit the value. Do not place it in public JavaScript.

## Find a Project ID

After a successful B2 proof request, open Netlify dashboard -> Forms -> `mosapack-save-design` and look for:

```text
project_id
project_saved=true
save_version=b2-v1
design_storage=netlify_blobs
```

## Retrieve a Saved Project

Use the deployed site URL or unique preview URL.

```bash
curl -sS \
  -H "x-mosa-admin-token: <MOSA_ADMIN_TOKEN>" \
  "https://mosapack.netlify.app/.netlify/functions/get-project?project_id=<PROJECT_ID>"
```

Expected result:

- `ok: true`
- `project` JSON with crop state, render settings, tile map, palette, color counts, and proof metadata
- `assets.cropped_source.data_url`
- `assets.preview.data_url`

If `MOSA_ADMIN_TOKEN` is not configured, the function returns a disabled/admin-token message and no project data.

## Delete a Saved Project

Use this for privacy deletion requests or cleanup of test submissions.

```bash
curl -sS -X POST \
  -H "content-type: application/json" \
  -H "x-mosa-admin-token: <MOSA_ADMIN_TOKEN>" \
  -d '{"project_id":"<PROJECT_ID>"}' \
  "https://mosapack.netlify.app/.netlify/functions/delete-project"
```

Expected result:

```json
{ "ok": true, "deleted": true, "project_id": "<PROJECT_ID>" }
```

## If Save-Project Fails

- The customer-facing UI should not claim the proof request was saved.
- Ask the customer to retry.
- If repeated failures occur, collect the Netlify deploy URL, browser, approximate image size, and timestamp.
- Do not ask the customer to send raw image data through Netlify Forms.

## Privacy SOP

- Store proof design data only after explicit consent.
- Keep raw image data out of Netlify Forms.
- Use `delete-project` for deletion requests tied to a `project_id`.
- If the customer does not have the `project_id`, search Netlify Forms by email and timestamp, then delete matching project records.
- Retention target is 30 days unless the request becomes an active order, proof conversation, or support conversation.

## Current Preview Project To Verify

B2 preview test created this project id:

```text
aa305cd8-48b9-4400-899b-67a492827c52
```

Preview URL:

```text
https://6a41a625f430d406693410b6--mosapack.netlify.app
```

After `MOSA_ADMIN_TOKEN` is configured, retrieve and delete this preview test project before production deploy approval.
