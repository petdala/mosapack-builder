# Canonical Builder Protocol

## Production Builder

The only canonical production builder is:

- `public/builder/index.html`

The production route is `/builder/`. Do not publish or link raw versioned builder files.

## Historical Lineage

The canonical builder is v6-derived. That lineage is approved, but public product copy and public routes must not use raw version labels.

## Superseded Files

v5 is superseded. Do not back-port v6 work into v5 and do not revive old builder files.

Forbidden public files and routes include:

- `builder-pro-v5.html`
- `builder-pro-v6.html`
- `builder-pro-v7.html`
- `builder-optimized-v8.html`

## Launch Rules

- No multiple production builders.
- No dashboard, affiliate, automation, fake API, or old mockup pages in production.
- No public quality scores, quality percentages, SSIM badges, Delta E badges, or Gold/Silver/Bronze quality labels.
- No checkout success, order success, or payment success state until D1 checkout exists.
- Checkout must remain honestly disabled until D1.
- Public copy should describe digital launch access, made-to-order custom proofs, proof approval, and premium custom quotes.

## B1.2 Wobrick Decision

Classification: C/D - unused public dependency with supplier/export functions exposed to the browser.

Decision: remove `public/builder/wobrick-integration.js` from the public launch surface and remove its script reference from `public/builder/index.html`.

Reason: the canonical builder does not call the Wobrick export functions for the customer proof flow, and the module exposed supplier-specific download/order guidance on `window`. Public launch should not send users to Wobrick, suppliers, or competitor ordering paths.

Future rule: supplier export logic may return later only as internal order/export metadata after D1/C gates, not as a public CTA or ordering path.
