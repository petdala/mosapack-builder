# Stripe Proof Credit Setup

Date: 2026-06-29
Status: setup guide only. No Stripe secret is stored in the repo.

## Product

Create a Stripe product:

```text
Custom Proof Credit
```

Price:

```text
$10 one-time payment
```

Customer-facing description:

```text
Applied toward your final digital or physical MosaPack kit. Refundable if your photo is not suitable.
```

## Payment Link

Create a Stripe Payment Link for the $10 one-time price.

Recommended settings:

- Collect customer email.
- Do not collect shipping address yet.
- Do not enable physical product shipping rates.
- Use safe proof-credit copy, not full-kit checkout copy.
- Success URL: `https://mosapack.netlify.app/proof-credit-success.html`
- Cancel URL: `https://mosapack.netlify.app/builder/`

## Public Configuration

The builder currently supports a public Payment Link only. Do not place Stripe secret keys in HTML, JavaScript, docs, or `netlify.toml`.

Use one of these public configuration paths:

```html
<meta name="mosapack-proof-credit-link" content="https://buy.stripe.com/...">
```

or:

```js
window.MOSAPACK_CONFIG = {
  PUBLIC_STRIPE_PROOF_CREDIT_LINK: "https://buy.stripe.com/..."
};
```

## Secret Keys

Keep Stripe secret keys only in Stripe/Netlify environment settings when a server-side Stripe integration is added later.

Environment variable names that may be used later:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PROOF_CREDIT_PRICE_ID`

Do not put values for these variables in the repo.

## D1 Limitation

D1 Payment Link handoff is intentionally manual:

- B2 saves the exact design.
- Netlify Forms captures the `project_id`.
- Stripe collects the proof-credit payment.
- Derek matches the payment to the proof request by email.

A webhook can be added later if D1 payment signal is strong enough.

## Preview Test Checklist

Before production:

1. Configure the public Payment Link on a preview deploy.
2. Generate a free preview.
3. Submit a custom proof request.
4. Confirm the proof-credit card appears after proof request success.
5. Click the Payment Link.
6. Confirm Stripe shows only the $10 proof credit.
7. Confirm success redirects to `/proof-credit-success.html`.
8. Confirm no raw image data appears in Netlify Forms.
9. Confirm no Stripe secret appears in public source.
