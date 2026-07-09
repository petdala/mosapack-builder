# D1 Checkout / Proof Credit Decision Brief

Date: 2026-06-29T04:47:25Z
Repo: `/Users/dereksolas/Developer/mosapack-clean`
Status: decision brief only; checkout is not implemented.

## Status

Deferred / not public. Stripe/proof credit payment is paused; the active conversion event is the free proof request. Keep this document as future reference only.

## Current Gate Status

B2 exact design save is production complete. MosaPack can save an exact proof design, retrieve it through the token-protected admin endpoint, and delete it for privacy cleanup. This clears the technical gate for deciding the first paid path.

D1 still requires a business/product decision before checkout code is implemented.

## Selected Direction

Recommended and selected next path:

```text
Custom Proof Credit — $10
Applied toward your final digital or physical kit.
Refundable if your photo is not suitable.
```

## Options Considered

### Option A — Keep Free Proof Request Only

- No payment yet.
- Lowest friction.
- Weakest buying signal.
- Best if still unsure about offer or pricing.

Decision: not the next step. B1/B2 already validate the free proof path; the next useful signal is paid intent.

### Option B — Paid Custom Proof Credit

- Customer pays a small proof credit.
- Credit applies toward final digital or physical product.
- Refundable if the photo/design is not suitable.
- Stronger intent signal without full fulfillment pressure.
- Keeps physical products proof/quote based until supplier and operations gates pass.

Decision: selected.

Initial offer:

```text
Custom Proof Credit — $10
Applied toward your final digital or physical kit.
Refundable if your photo is not suitable.
```

### Option C — Full Digital Product Checkout

- Sell Digital Mystery Reveal Pack first.
- Lower operational risk than physical checkout.
- Requires delivery flow, customer expectation copy, file generation/delivery, and support path.

Decision: likely next after proof credit, but not first.

### Option D — Full Physical Kit Checkout

- Not recommended yet.
- Requires supplier samples, packaging, assembly test, shipping test, landed cost, return terms, and fulfillment SOP.
- Physical products remain proof/quote paths until those gates pass.

Decision: reject for now.

## Recommended Path

1. Launch Option B first: $10 Custom Proof Credit.
2. Use B2 saved design as the proof reference.
3. Keep physical products proof/quote based.
4. Add Option C digital checkout only after proof-credit flow is stable.
5. Do not implement full physical kit checkout until supplier/ops gates are complete.

## D1 Business Decisions

Resolved:

| Question | Decision |
| --- | --- |
| Proof credit amount | $10 |
| Refund rule | Refundable if photo is not suitable |
| Credit applies to | Final digital or physical kit |
| First paid path | Custom Proof Credit |

Still open before implementation:

| Question | Needed decision |
| --- | --- |
| Proof response time | Avoid hard promises until operational capacity is confirmed |
| Exact deliverable | Define whether customer receives proof image only, recommendation notes, revision option, or quote |
| Payment tool | Decide simplest safe first tool before code: Stripe Payment Link, Stripe Checkout, or another manual payment method |
| Refund copy | Must avoid unlimited revisions, guaranteed approval, free remake, or fixed turnaround promises |
| Netlify Forms integration | Decide whether paid proof creates a separate form submission, updates current form copy, or sends payment metadata to the saved project record |
| Manual ops | Define how Derek tracks paid proof credits against final kit purchases |

## Safe Starter Copy

Suggested public copy for D1:

```text
Custom Proof Credit — $10
Get a reviewed proof recommendation for your saved mosaic design. Your $10 credit applies toward your final digital or physical kit. If your photo is not suitable for a MosaPack proof, the credit is refundable.
```

Avoid:

- instant checkout language for physical kits
- guaranteed proof approval
- fixed proof turnaround until operations are confirmed
- unlimited revisions
- public quality scores
- supplier automation claims

## Implementation Guardrails

D1 must not add:

- full physical kit checkout
- supplier APIs
- Shopify
- Wobrick
- public quality scores
- hard email gate before free preview
- dashboards/admin UI

D1 may add only the minimum paid proof-credit path after the payment-tool decision is made.
