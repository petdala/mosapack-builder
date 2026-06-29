# D1 Proof Credit Implementation Plan

Date: 2026-06-29
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Status: implementation plan for the first paid proof-credit handoff.

## Decision

MosaPack will add a lightweight paid proof-credit step after the B2 proof request is saved.

Offer:

```text
Custom Proof Credit - $10
Applied toward your final digital or physical kit.
Refundable if your photo is not suitable.
```

## Scope

D1 adds only a proof-credit payment handoff after the user has already:

- uploaded a photo
- generated a free preview
- requested a custom proof
- consented to temporary design storage
- saved an exact B2 design with `project_id`
- submitted proof metadata through Netlify Forms

## Out of Scope

D1 does not add:

- full checkout
- Stripe secret handling in the browser
- Shopify
- supplier APIs
- physical kit ordering
- automated fulfillment
- public quality scores
- a hard email gate before free preview
- an admin dashboard

## Proposed Flow

1. User generates a free preview.
2. User opens the custom proof request.
3. User submits proof request with design-storage consent.
4. Builder saves the exact B2 design via `/.netlify/functions/save-project`.
5. Builder submits metadata-only Netlify Form data with the returned `project_id`.
6. After both save and form submission succeed, the proof-credit card appears.
7. If a Stripe Payment Link is configured, the card opens Stripe in a new tab.
8. If no Payment Link is configured, the card stays disabled with honest setup-pending copy.

## Configuration

The public Payment Link must be configured without exposing Stripe secrets.

Supported public configuration:

- `window.MOSAPACK_CONFIG.PUBLIC_STRIPE_PROOF_CREDIT_LINK`
- `window.MOSAPACK_CONFIG.proofCreditPaymentLink`
- `<meta name="mosapack-proof-credit-link" content="">`

Only a public Stripe Payment Link beginning with `https://buy.stripe.com/` should be accepted by the client.

## Acceptance Criteria

- Proof credit card appears only after a successful custom proof request.
- Proof request success still requires B2 save success and Netlify Forms success.
- Payment button is disabled if no Payment Link is configured.
- No Stripe secret keys appear in public files.
- No image data is sent through Netlify Forms.
- Success page exists for a future Payment Link redirect.
- Returns policy states the $10 refund/apply rule.
- Production deploy remains blocked until Stripe Payment Link setup and preview testing are complete.

## Risks

- Stripe Payment Links do not automatically update the saved B2 project unless a webhook is added later.
- Matching proof credit to proof request is manual at D1, using the same customer email and `project_id` context.
- Payment Link setup must avoid full physical checkout language.

## Next Gate

Before production deploy, Derek must create and test the Stripe Payment Link in preview or a controlled live payment test, then confirm the success URL and refund copy are correct.
