# CLAUDE.md — MosaPack Clean Repo

## Current Mission

MosaPack A0/A1/A2/A3/A4 foundation work only.

## Rules

- No new builder version.
- No feature expansion before A0 foundation is complete.
- No partner/referral system, internal reporting UI, or automation work.
- No public quality score or badge.
- Digital path launches first.
- Physical product work is parallel R&D and does not block digital launch.
- Never commit credentials.
- Never place credentials in client-side HTML or JavaScript.
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

## Review Handoff Rule

After any task that changes code/docs meaningfully, report:
- repo path
- branch
- commit
- preview URL if applicable
- verification results
- package/report path from `scripts/create-chatgpt-review-package.sh`

Do not claim ChatGPT can see local files. ChatGPT needs a pushed GitHub branch/commit/PR or uploaded/generated ZIP.

Preferred command after future Codex work:
`bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --run-verification`

For generated visual reviews:
`bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --include-tmp-review /tmp/<review-folder>`
