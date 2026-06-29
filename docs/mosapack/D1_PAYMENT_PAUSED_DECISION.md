# D1 Payment Paused Decision

Date: 2026-06-29
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Status: D1 payment deferred; not public.

## Decision

Pause Stripe and the $10 proof-credit payment path for now.

The current active conversion event is the free custom proof request. The product should not show a dead, disabled, or coming-soon payment CTA.

## Reason

MosaPack needs to validate proof request quality and supplier feasibility before adding payment infrastructure. The immediate operational question is whether incoming saved proof requests can be reviewed, matched to a retrievable B2 project, and turned into useful supplier/pricing decisions.

## Active Customer Path

1. User uploads a photo.
2. User generates a free preview.
3. User requests a custom proof.
4. B2 saves the exact design state.
5. Netlify Forms captures metadata and `project_id`.
6. Derek reviews the saved proof request manually.

## Deferred Payment Concept

The `$10 proof credit` remains an approved future concept, but it is not active publicly.

Future copy to revisit:

```text
Custom Proof Credit - $10
Applied toward your final digital or physical kit.
Refundable if your photo is not suitable.
```

## Conditions To Resume D1 Payment

Resume proof-credit/payment work only after:

- 5-10 qualified free proof requests are received.
- B2 retrieval and deletion workflow works reliably in normal operations.
- Supplier path and rough pricing are clearer.
- The paid deliverable is defined clearly enough for public copy.
- Refund, response-time, and revision expectations are operationally safe.

## Current Recommendation

Do not implement Stripe, Shopify, checkout, supplier APIs, dashboards, or physical kit purchase flow. Run manual proof operations and supplier RFQs first.

## Preview Verification

Preview deploy tested on 2026-06-29:

```text
https://6a425e9e82008a42a392e6b1--mosapack.netlify.app
```

Hosted builder proof request result:

- Free preview path worked.
- B2 design save returned a saved project ID.
- Netlify Forms metadata submission completed through the real UI path.
- `Proof Request Saved` next-step card appeared.
- No proof-credit, Stripe, Payment Link, or dead payment CTA was visible.
- Preview test project ID: `91d26c0e-76fd-4f90-a4ac-c9cadd59f0b1`.

Delete the preview test project through the B2 admin deletion runbook if cleanup is needed.
