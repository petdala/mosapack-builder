# AGENTS.md — MosaPack Clean Repo

## Current Mission

MosaPack A0/A1/A2/A3/A4 foundation work.

Immediate priority:
- credential exposure review and rotation planning,
- legal/privacy/contact placement,
- analytics event spec,
- curated launch surface under `public/`.

## Hard Rules

- No new builder version.
- No partner or referral system.
- No internal reporting UI build.
- No automation platform.
- No public quality score or badge.
- Digital path launches first.
- Physical product work is parallel R&D and does not block the digital reveal pack.
- No credentials in client-side HTML, JavaScript, or committed files.
- Publish only `public/`.
- Do not deploy production without explicit approval.
- Do not fake checkout, email capture, or order success states.

## Read First

- `docs/mosapack/EXECUTION_BOARD_V2.md`
- `docs/mosapack/A0_CREDENTIAL_ROTATION_CHECKLIST.md`
- `docs/mosapack/A4_ANALYTICS_EVENT_SPEC.md`
- `docs/mosapack/SECURITY_ROTATION_LOG.md`


## Canonical Builder Protocol

- Canonical production builder: `public/builder/index.html`.
- Builder lineage is v6-derived, but public routes and copy must not expose raw version names.
- v5 is superseded; do not back-port into v5 or revive old builder files.
- Do not expose `builder-pro-v5.html`, `builder-pro-v6.html`, `builder-pro-v7.html`, or `builder-optimized-v8.html`.

## Launch Surface

- Landing page: `public/index.html`
- Builder: `public/builder/index.html`
- Legal: `public/legal/`
- Contact: `public/contact/`

## Review Handoff Rule

After any task that changes code/docs meaningfully, report:
- repo path
- branch
- commit
- preview URL
- verification results
- package path from `scripts/create-chatgpt-review-package.sh`

Do not claim ChatGPT can see local files. ChatGPT needs GitHub/Drive/uploaded ZIP.
