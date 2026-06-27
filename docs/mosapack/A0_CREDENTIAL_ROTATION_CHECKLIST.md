# A0 Credential Rotation Checklist

A0 is credential containment and public exposure cleanup. Do not create new provider keys during A0.

## Kit / ConvertKit

- Provider: Kit/ConvertKit
- Status: discontinued
- Access status: account inaccessible without paying past-due balance
- Exposed key last 4: `4cCw`
- New key: none
- Replacement: Netlify Forms for waitlist/save/contact capture
- Required manual action: Derek must contact Kit support to cancel/downgrade the account, waive/refund charges if possible, and revoke/delete any active API keys
- Verification status: provider-side revocation pending support confirmation
- Launch mitigation: clean Netlify deploy must remove all old live files that expose the key
- Do not create a new Kit key
- Do not include Kit scripts/API calls in the clean repo

Because provider access is blocked, A2 clean deploy is allowed to proceed after support is contacted/pending so the public site stops serving the exposed key. A0 is not fully closed until Kit confirms the old key/account is dead.

## A0 Exit Requirements

- Clean repo contains no client-side provider credentials.
- Clean repo public files contain no Kit/ConvertKit scripts or API calls.
- Waitlist capture posts to Netlify Forms.
- Save-design/reveal-interest capture posts metadata only to Netlify Forms.
- Contact capture posts to Netlify Forms.
- Checkout remains disabled until real server-backed checkout exists.
- A2 deploy cleanup removes old live builder/dashboard files that expose the burned key.
- SECURITY_ROTATION_LOG.md records manual provider status without full credential values.
