# B2 Production Deploy Report

Date: 2026-06-29T03:43:51Z
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Branch: `feature/b2-exact-design-save`
Commit deployed: `b9a4f75 feat: add B2 exact design save with Netlify Blobs`

## Deploy

Command used:

```bash
/Users/dereksolas/.npm-global/bin/netlify deploy --dir=public --functions=netlify/functions --no-build --prod
```

Result: production deploy completed successfully.

Production URL:

```text
https://mosapack.netlify.app
```

Unique deploy URL:

```text
https://6a41e979bcfb3fab104b656e--mosapack.netlify.app
```

Build logs:

```text
https://app.netlify.com/projects/mosapack/deploys/6a41e979bcfb3fab104b656e
```

Functions included:

- `save-project`
- `get-project`
- `delete-project`

## Production Exposure Verification

`bash scripts/verify-live-exposure.sh` passed after production deploy.

Confirmed:

- Required routes returned 200.
- Old builders and dashboards remained 404.
- No public Wobrick CTA was found.
- No fake checkout/order success state was found.
- No public quality score labels were found.
- Netlify Forms markup was detected for expected forms.

## Production Proof Save Test

Submitted exactly one production proof-save request through the real UI path at:

```text
https://mosapack.netlify.app/builder/
```

Test data:

- Email: `derek+mosapack-b2-prod-test@example.com`
- Name: `B2 Production Test`
- Category: `Pet`
- Note: `B2 production exact design save test. Safe to delete.`

Result:

- UI success: yes
- `save-project` status: 200
- Project id: `b5dea1c9-e20b-42c5-94ea-b75ca50e45df`
- Netlify Forms metadata included matching `project_id`: yes
- Netlify Forms metadata included `project_saved=true`: yes
- Netlify Forms metadata included `save_version=b2-v1`: yes
- Netlify Forms metadata included `design_storage=netlify_blobs`: yes
- Netlify Forms payload contained image data: no

## Production Admin Retrieval

`get-project` was called with the admin token supplied from the shell/clipboard path. The token was not printed, written to a file, committed, or added to docs.

Result:

- `ok: true`
- Project id matched: yes
- Project JSON retrievable: yes
- Preview asset retrievable: yes
- Cropped source asset retrievable: yes

## Production Delete Verification

`delete-project` was called with the same production project id.

Result:

- `ok: true`
- `deleted: true`
- Project id matched: yes

## Privacy and Retention Status

- Free preview remains local until proof/save.
- Proof/save requires explicit temporary design storage consent.
- Full original image is not stored by default.
- B2 stores the approved cropped source image, rendered preview, and project JSON.
- Raw image data is not sent through Netlify Forms.
- Privacy policy documents custom proof design storage and 30-day intended retention.
- Deletion endpoint exists for manual privacy requests.

## Remaining Issues

| Priority | Issue | Status |
| --- | --- | --- |
| P0 | None | Clear |
| P1 | None | Clear |
| P2 | Automatic 30-day deletion is not implemented | Manual deletion path exists through `delete-project` |
| P2 | No admin UI | Token-protected retrieval endpoint is sufficient for B2 |

## D1 Checkout Status

D1 checkout remains blocked until business/product decisions are made. B2 confirms exact design save, retrieval, and deletion, but does not approve Stripe, Shopify, supplier automation, or instant physical checkout.

## Admin Token Rotation Verification - 2026-06-29

After the prior admin token exposure risk, `MOSA_ADMIN_TOKEN` was rotated in Netlify and production functions were redeployed.

Verification result:

- Production function routes were mounted.
- Authenticated `get-project` passed for the rotation test project.
- Retrieved project JSON, preview asset, and cropped source asset were present.
- `delete-project` passed for the rotation test project.
- The rotated token was not written to docs, config, public files, or git.

B2 status remains production complete.
