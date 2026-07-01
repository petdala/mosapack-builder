# Codex -> ChatGPT Review Handoff

## Summary

[One paragraph summary]

## Repo

- Path:
- Branch:
- Commit:
- GitHub link:
- Preview URL:
- Production URL:
- Report folder:

## What Changed

- Public app:
- Functions:
- Scripts:
- Docs:
- Config:

## Verification

- security-scan:
- verify-clean-repo:
- verify-netlify-forms:
- verify-b2-design-save:
- verify-live-exposure:
- other scripts:

## Generated Artifacts

- Review package:
- Link-first report:
- Gallery/package path if applicable:
- Screenshots if applicable:

## Generated Visual Review Packages

When Codex creates visual review packages under `/tmp`, Derek must either:

1. upload the generated ZIP directly, or
2. run:
   `bash scripts/create-chatgpt-review-package.sh --include-tmp-review /tmp/<review-folder>`

For Mosaic Clean and Detail Priority reviews, confirm the package includes:

- `index.html`
- `contact-sheets/`
- `detail-pages/`
- `data/`
- `README.md`

Do not upload or package old table-style galleries when the current report says a card/contact-sheet package exists.

For link-first review, use:

`bash scripts/create-chatgpt-review-package.sh --commit-report --timestamped --include-tmp-review /tmp/<review-folder>`

Generated visual review references:

- Tmp review folder:
- Tmp review ZIP:
- index.html:
- contact-sheets:
- detail-pages:
- data:
- README:

## Known Issues

- P0:
- P1:
- P2:

## Production Recommendation

Yes/No and why.

## What ChatGPT Should Review

[Specific files/areas]

## Next Recommended Task

[Specific next task]
