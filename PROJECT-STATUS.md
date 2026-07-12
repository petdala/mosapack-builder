# MosaPack Project Status

Updated: 2026-07-11

## Live Surface

- Production URL: https://mosapack.netlify.app
- Current production baseline: Step 3 compaction release from commit `360b5e2`
- Active branch for this pass: `fix/builder-commercial-wow-completion-v1`
- Canonical public builder file: `public/builder/index.html`
- Landing page: `public/index.html`

## Public Builder Doctrine

MosaPack is a proof-first custom sticker mosaic builder:

```text
Upload photo -> crop -> preview buildable mosaic -> request proof -> proof saved
```

The builder creates an honest preview and captures a proof request. Nothing is made before a person checks the design. Payment, if any, happens only after proof approval outside the builder.

## Do Not Revive

Archived and legacy docs are not implementation truth. Old Pro Builder, Shopify, cart, brick, affiliate, dashboard, Printful, and configurator files must not drive new builder work.

Do not add these to normal public UI without a new approved spec:

- checkout or payment
- pricing or cart states
- shipping or production promises
- supplier APIs
- LEGO/brick positioning
- public PDF/BOM exports
- material/finish configurators
- public advanced settings
- Mosaic Clean public UI
- Detail Priority Map

## Current Public Paths

- `/` launches the proof-first landing page.
- `/builder/` mounts only the public proof wizard.
- `/builder/?ops=1` may mount internal operator/export tools.
