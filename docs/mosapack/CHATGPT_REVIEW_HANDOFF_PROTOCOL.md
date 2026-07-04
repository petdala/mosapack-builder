# ChatGPT Review Handoff Protocol

## Purpose

Codex work is local until committed, pushed, or uploaded. ChatGPT cannot automatically read Derek's local filesystem. Every review needs either:

1. a pushed GitHub branch, commit, or PR, or
2. an uploaded review ZIP.

## Best Workflow

1. Codex completes task.
2. Codex commits changes.
3. Codex runs verification scripts.
4. Codex runs:
   `bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --run-verification`
5. Derek either:
   - pushes branch and gives ChatGPT the branch, commit, or PR, or
   - uploads the generated ZIP if ChatGPT needs local/generated artifacts.

## What Codex Must Report Every Time

- Repo path
- Branch
- Commit hash
- Preview URL if any
- Files changed
- Docs created/updated
- Scripts/functions changed
- Verification results
- Generated review package path
- Production deploy recommendation
- Next recommended task

## What Must Never Be Included

- `.env`
- secrets
- API tokens
- admin tokens
- `node_modules`
- `.netlify`
- private QA image folders
- generated saved project payloads
- Stripe secret keys
- Netlify tokens
- `MOSA_ADMIN_TOKEN`
- old exposed Kit/ConvertKit keys

## Important

Untracked files are invisible to GitHub and ChatGPT unless included in the ZIP or committed. Important research docs should be preserved under:

`docs/mosapack/research/`

The review package is a handoff artifact, not a deploy artifact. Do not commit generated ZIP files or `/tmp` package folders.

## Link-first Review Workflow

Preferred:

1. Codex commits task.
2. Codex runs:
   `bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --run-verification`
3. Codex commits the generated review report.
4. Codex pushes branch.
5. Derek gives ChatGPT the GitHub branch, commit, or PR link.

Fallback:

1. Codex runs:
   `bash scripts/create-chatgpt-review-package.sh`
2. Derek uploads ZIP.

The committed report lives at:

- `docs/mosapack/reviews/latest/REVIEW_HANDOFF.md`
- `docs/mosapack/reviews/<timestamp>-<branch-slug>-<short-commit>/REVIEW_HANDOFF.md`

The `latest` folder is overwritten each run. Timestamped folders are immutable review snapshots.

## Generated Visual Review Packages

When Codex creates visual review packages under `/tmp`, Derek must either:

1. upload the generated ZIP directly, or
2. run:
   `bash scripts/create-chatgpt-review-package.sh --include-tmp-review /tmp/<review-folder>`

For link-first review, run:

`bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --include-tmp-review /tmp/<review-folder>`

This records the generated review folder path and structure in the committed report without copying private/generated images into the repo.

For Mosaic Clean and Detail Priority reviews, the package should include:

- `index.html`
- `contact-sheets/`
- `detail-pages/`
- `data/`
- `README.md`

Do not upload or package old table-style galleries when the current report says a card/contact-sheet package exists. The package script will warn if an included Mosaic Clean or Detail Priority folder appears to be an older table-style review package.

If ChatGPT needs the actual visuals, upload the generated ZIP or host a preview. Do not commit private/generated image outputs by default.
