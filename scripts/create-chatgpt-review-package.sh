#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/create-chatgpt-review-package.sh [options]

Creates a sanitized ChatGPT review package under /tmp by default.

Options:
  --include-tmp-review PATH   Include one generated /tmp review folder in the ZIP package.
                              With --commit-report, repo reports reference the folder only.
  --commit-report             Create repo-tracked review report files under docs/mosapack/reviews/latest/.
  --report-only               Create/update repo review reports without creating a ZIP.
  --timestamped               Also create immutable docs/mosapack/reviews/<timestamp>-<branch>-<commit>/.
  --run-verification          Run verification scripts and capture output in VERIFICATION.md.
  -h, --help                  Show this help.
USAGE
}

INCLUDE_TMP_REVIEW=""
COMMIT_REPORT=0
REPORT_ONLY=0
TIMESTAMPED=0
RUN_VERIFICATION=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --include-tmp-review)
      [[ $# -ge 2 ]] || { echo "Missing path after --include-tmp-review" >&2; exit 2; }
      INCLUDE_TMP_REVIEW="$2"
      shift 2
      ;;
    --commit-report)
      COMMIT_REPORT=1
      shift
      ;;
    --report-only)
      COMMIT_REPORT=1
      REPORT_ONLY=1
      shift
      ;;
    --timestamped)
      TIMESTAMPED=1
      shift
      ;;
    --run-verification)
      RUN_VERIFICATION=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

BRANCH="$(git branch --show-current 2>/dev/null || true)"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH_SLUG="$(printf '%s' "${BRANCH:-detached}" | tr '/[:upper:]' '-[:lower:]' | sed 's/[^a-z0-9._-]/-/g; s/--*/-/g; s/^-//; s/-$//')"
REPORT_ID="${TIMESTAMP}-${BRANCH_SLUG:-branch}-${COMMIT}"
OUT_DIR="/tmp/mosapack-chatgpt-review-${TIMESTAMP}"
ZIP_PATH="${OUT_DIR}.zip"
LATEST_REPORT_DIR="docs/mosapack/reviews/latest"
TIMESTAMPED_REPORT_DIR="docs/mosapack/reviews/${REPORT_ID}"
FILE_LIST="$(mktemp)"
CHANGED_ONLY_LIST="$(mktemp)"
UNION_LIST="$(mktemp)"
PRE_STATUS="$(mktemp)"
PRE_DIFF_STAT="$(mktemp)"
PRE_CHANGED_FILES="$(mktemp)"
SECRET_HITS="${OUT_DIR}/99_SECRET_SCAN_REVIEW_REQUIRED.txt"
GENERATED_CONTENTS="${OUT_DIR}/REVIEW_PACKAGE_CONTENTS.txt"
GENERATED_WARNINGS="$(mktemp)"
ARTIFACT_FACTS="$(mktemp)"
VERIFICATION_CAPTURE="$(mktemp)"
SECRET_SCAN_FOUND=0
UNTRACKED_COUNT=0
ZIP_CREATED=0
BRANCH_SCOPE_WARNING=""

cleanup() {
  rm -f "$FILE_LIST" "$CHANGED_ONLY_LIST" "$UNION_LIST" "$PRE_STATUS" "$PRE_DIFF_STAT" "$PRE_CHANGED_FILES" "$GENERATED_WARNINGS" "$ARTIFACT_FACTS" "$VERIFICATION_CAPTURE"
}
trap cleanup EXIT

run_or_blank() {
  "$@" 2>/dev/null || true
}

append_fact() {
  printf '%s\n' "$1" >> "$ARTIFACT_FACTS"
}

yes_no_path() {
  local path="$1"
  [[ -e "$path" ]] && echo "yes" || echo "no"
}

capture_pre_report_state() {
  run_or_blank git status --short > "$PRE_STATUS"
  run_or_blank git diff --stat > "$PRE_DIFF_STAT"
  {
    if git show-ref --verify --quiet refs/heads/main; then
      run_or_blank git diff --name-only main...HEAD
    fi
    run_or_blank git diff --name-only
    run_or_blank git diff --cached --name-only
  } | sort -u > "$PRE_CHANGED_FILES"
}

detect_branch_scope_warning() {
  local scope_count
  scope_count="$(wc -l < "$CHANGED_ONLY_LIST" | tr -d ' ')"
  if [[ "$scope_count" -gt 40 ]] || grep -E '^(public/|netlify/functions/)' "$CHANGED_ONLY_LIST" >/dev/null 2>&1; then
    BRANCH_SCOPE_WARNING="WARNING: This branch includes product/app changes beyond handoff tooling. Confirm PR scope before merge."
  else
    BRANCH_SCOPE_WARNING=""
  fi
}

make_changed_file_union() {
  : > "$FILE_LIST"
  if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
    run_or_blank git diff --name-only HEAD~1..HEAD >> "$FILE_LIST"
  fi
  run_or_blank git diff --name-only >> "$FILE_LIST"
  run_or_blank git diff --cached --name-only >> "$FILE_LIST"
  if git show-ref --verify --quiet refs/heads/main; then
    run_or_blank git diff --name-only main...HEAD >> "$FILE_LIST"
  fi

  sort -u "$FILE_LIST" > "$CHANGED_ONLY_LIST"

  add_if_present "public/builder/index.html"
  add_if_present "public/index.html"
  add_if_present "netlify.toml"
  add_if_present "package.json"
  add_if_present "package-lock.json"
  add_glob_if_present "netlify/functions/*.mjs" || true
  add_glob_if_present "scripts/*.sh" || true
  add_glob_if_present "docs/mosapack/*.md" || true
  add_glob_if_present "docs/mosapack/research/*.md" || true
  add_glob_if_present ".github/PULL_REQUEST_TEMPLATE/*.md" || true
  add_if_present "AGENTS.md"
  add_if_present "CLAUDE.md"

  sort -u "$FILE_LIST" > "$UNION_LIST"
}

add_if_present() {
  local path="$1"
  if [[ -e "$path" ]]; then
    printf '%s\n' "$path" >> "$FILE_LIST"
  fi
}

add_glob_if_present() {
  local pattern="$1"
  local matched=0
  while IFS= read -r path; do
    [[ -n "$path" ]] || continue
    matched=1
    printf '%s\n' "$path" >> "$FILE_LIST"
  done < <(compgen -G "$pattern" || true)
  return $matched
}

is_excluded_path() {
  local path="$1"
  local lower_path
  lower_path="$(printf '%s' "$path" | tr '[:upper:]' '[:lower:]')"
  [[ -z "$path" ]] && return 0
  [[ "$path" = /* ]] && return 0
  [[ "$path" == .git/* || "$path" == node_modules/* || "$path" == .netlify/* || "$path" == .venv/* ]] && return 0
  [[ "$path" == .env || "$path" == .env.* ]] && return 0
  [[ "$path" == *.pem || "$path" == *.key ]] && return 0
  [[ "$path" == *saved-project-payload* || "$path" == *project-payload* ]] && return 0
  case "$lower_path" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.heic|*.tif|*.tiff)
      if [[ "$path" == docs/* ]] && git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
        return 1
      fi
      return 0
      ;;
  esac
  return 1
}

copy_repo_file() {
  local path="$1"
  if is_excluded_path "$path"; then
    return 0
  fi
  [[ -f "$path" ]] || return 0

  local size
  size="$(wc -c < "$path" | tr -d ' ')"
  if [[ "$size" -gt 15728640 ]]; then
    echo "Skipped large file over 15MB: $path" >> "$OUT_DIR/00_SKIPPED_FILES.txt"
    return 0
  fi

  mkdir -p "$OUT_DIR/$(dirname "$path")"
  cp "$path" "$OUT_DIR/$path"
}

warn_generated_review() {
  local message="$1"
  echo "WARNING: $message"
  printf 'WARNING: %s\n' "$message" >> "$GENERATED_WARNINGS"
}

has_table_style_index() {
  local index_file="$1"
  [[ -f "$index_file" ]] || return 1
  grep -Eiq '<table|<tr[ >]|<td[ >]' "$index_file"
}

has_card_contact_structure() {
  local source_dir="$1"
  [[ -d "$source_dir/contact-sheets" ]] || return 1
  [[ -d "$source_dir/detail-pages" ]] || return 1
  grep -Eiq 'contact-sheets|detail-pages|class="card"|class=.card' "$source_dir/index.html"
}

inspect_generated_review_folder() {
  : > "$ARTIFACT_FACTS"
  if [[ -z "$INCLUDE_TMP_REVIEW" ]]; then
    append_fact "- Generated review folder: not supplied"
    return 0
  fi
  if [[ ! -d "$INCLUDE_TMP_REVIEW" ]]; then
    echo "Requested tmp review folder does not exist: $INCLUDE_TMP_REVIEW" >&2
    exit 2
  fi
  case "$INCLUDE_TMP_REVIEW" in
    /tmp/*|/private/tmp/*|/private/var/folders/*) ;;
    *)
      echo "--include-tmp-review must point to a /tmp generated review folder." >&2
      exit 2
      ;;
  esac

  local source_lower sibling_zip
  source_lower="$(printf '%s' "$INCLUDE_TMP_REVIEW" | tr '[:upper:]' '[:lower:]')"
  sibling_zip="${INCLUDE_TMP_REVIEW}.zip"

  append_fact "- Generated review folder: $INCLUDE_TMP_REVIEW"
  append_fact "- Generated review ZIP sibling: $sibling_zip ($(yes_no_path "$sibling_zip"))"
  append_fact "- index.html: $(yes_no_path "$INCLUDE_TMP_REVIEW/index.html")"
  append_fact "- README.md: $(yes_no_path "$INCLUDE_TMP_REVIEW/README.md")"
  append_fact "- data/: $(yes_no_path "$INCLUDE_TMP_REVIEW/data")"
  append_fact "- contact-sheets/: $(yes_no_path "$INCLUDE_TMP_REVIEW/contact-sheets")"
  append_fact "- detail-pages/: $(yes_no_path "$INCLUDE_TMP_REVIEW/detail-pages")"
  append_fact "- Privacy warning: generated visuals may include private QA-derived images; do not commit generated review images unless explicitly approved."

  warn_generated_review "Generated visuals may contain private QA-derived images. Share intentionally."
  if [[ ! -f "$INCLUDE_TMP_REVIEW/index.html" ]]; then
    warn_generated_review "Included review folder is missing index.html."
  fi
  if [[ ! -f "$INCLUDE_TMP_REVIEW/README.md" ]]; then
    warn_generated_review "Included review folder is missing README.md."
  fi
  if has_table_style_index "$INCLUDE_TMP_REVIEW/index.html" && ! has_card_contact_structure "$INCLUDE_TMP_REVIEW"; then
    warn_generated_review "Included review index appears table-style; confirm this is the intended package."
  fi

  case "$source_lower" in
    *mosaic-clean*|*detail-priority*)
      [[ -d "$INCLUDE_TMP_REVIEW/data" ]] || warn_generated_review "Mosaic/detail review folder is missing data/."
      [[ -d "$INCLUDE_TMP_REVIEW/contact-sheets" ]] || warn_generated_review "Mosaic/detail review folder is missing contact-sheets/."
      [[ -d "$INCLUDE_TMP_REVIEW/detail-pages" ]] || warn_generated_review "Mosaic/detail review folder is missing detail-pages/."
      if has_table_style_index "$INCLUDE_TMP_REVIEW/index.html" && ! has_card_contact_structure "$INCLUDE_TMP_REVIEW"; then
        warn_generated_review "This looks like the old v1 review package. Use v2/v3/v4 package instead."
      fi
      ;;
  esac
}

copy_generated_review_to_zip() {
  [[ -n "$INCLUDE_TMP_REVIEW" ]] || return 0
  mkdir -p "$OUT_DIR/generated-review"
  local review_basename copied_review_dir
  review_basename="$(basename "$INCLUDE_TMP_REVIEW")"
  copied_review_dir="$OUT_DIR/generated-review/$review_basename"
  rsync -a \
    --exclude '.DS_Store' \
    --exclude '.env' \
    --exclude '.env.*' \
    --exclude '.netlify' \
    --exclude 'node_modules' \
    --exclude '*.pem' \
    --exclude '*.key' \
    --exclude '*.raw' \
    --exclude '*original-source*' \
    --exclude '*saved-project-payload*' \
    --exclude '*project-payload*' \
    "$INCLUDE_TMP_REVIEW/" "$copied_review_dir/"
  {
    echo "Generated review source: $INCLUDE_TMP_REVIEW"
    echo "Generated review package path: generated-review/$review_basename"
    echo
    find "$copied_review_dir" -type f | sort | sed "s#^$OUT_DIR/##"
  } > "$GENERATED_CONTENTS"
}

write_package_handoff() {
  mkdir -p "$OUT_DIR"
  {
    echo "# MosaPack ChatGPT Review Handoff"
    echo
    echo "- Repo path: $ROOT_DIR"
    echo "- Branch: ${BRANCH:-unknown}"
    echo "- Commit: $COMMIT"
    echo "- Timestamp: $TIMESTAMP"
    echo
    echo "## Instructions for ChatGPT"
    echo
    echo "Review this package as a repo handoff snapshot. Focus on changed files, verification evidence, and release risk. Do not assume access to Derek's local filesystem beyond files included here."
    echo
    echo "## Git Status Short"
    echo
    echo '```text'
    run_or_blank git status --short
    echo '```'
    echo
    echo "## Recent Log"
    echo
    echo '```text'
    run_or_blank git log -10 --oneline
    echo '```'
    echo
    echo "## Diff Stat"
    echo
    echo '```text'
    run_or_blank git diff --stat
    echo '```'
    echo
    echo "## Diff Name Status"
    echo
    echo '```text'
    run_or_blank git diff --name-status
    echo '```'
    echo
    echo "## Untracked Important Docs Warning"
    echo
    echo "Untracked files are not visible to GitHub or ChatGPT unless included in this ZIP or committed."
    echo
    echo '```text'
    run_or_blank git ls-files --others --exclude-standard
    echo '```'
    echo
    echo "## Verification Script Availability"
    echo
    echo '```text'
    run_or_blank find scripts -maxdepth 1 -type f -name '*.sh' | sort
    echo '```'
  } > "$OUT_DIR/00_HANDOFF.md"

  run_or_blank git status --short > "$OUT_DIR/02_GIT_STATUS.txt"
  run_or_blank git diff --stat > "$OUT_DIR/03_GIT_DIFF_STAT.txt"
  run_or_blank git log -10 --oneline > "$OUT_DIR/04_RECENT_LOG.txt"
  run_or_blank git ls-files --others --exclude-standard > "$OUT_DIR/05_UNTRACKED_FILES.txt"
  cp "$CHANGED_ONLY_LIST" "$OUT_DIR/01_CHANGED_FILES.txt"
  cp "$UNION_LIST" "$OUT_DIR/06_INCLUDED_CONTEXT_FILES.txt"
  echo "No generated review folder included. Use --include-tmp-review /tmp/<review-folder> to add one." > "$GENERATED_CONTENTS"
}

create_zip_package() {
  write_package_handoff
  while IFS= read -r path; do
    copy_repo_file "$path"
  done < "$UNION_LIST"
  copy_generated_review_to_zip

  if [[ -s "$GENERATED_WARNINGS" ]]; then
    {
      echo
      echo "## Generated Visual Review Warnings"
      echo
      cat "$GENERATED_WARNINGS"
    } >> "$OUT_DIR/00_HANDOFF.md"
  fi

  if grep -RInE 'sk_live|sk_test|rk_live|whsec_|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|api_key|apikey|secret|bearer|private_key|access_token|ConvertKit|CONVERTKIT|YOUR_PIXEL_ID|4cCw|MOSA_ADMIN_TOKEN' "$OUT_DIR" > "$SECRET_HITS" 2>/dev/null; then
    SECRET_SCAN_FOUND=1
  else
    rm -f "$SECRET_HITS"
  fi

  (
    cd "$(dirname "$OUT_DIR")"
    zip -qr "$(basename "$ZIP_PATH")" "$(basename "$OUT_DIR")"
  )
  ZIP_CREATED=1
}

group_file_list() {
  local heading="$1" pattern="$2"
  echo "### $heading"
  echo
  if grep -E "$pattern" "$CHANGED_ONLY_LIST" >/dev/null 2>&1; then
    grep -E "$pattern" "$CHANGED_ONLY_LIST" | sed 's/^/- `/' | sed 's/$/`/'
  else
    echo "- None detected"
  fi
  echo
}

run_verification_capture() {
  : > "$VERIFICATION_CAPTURE"
  local scripts=(
    "scripts/security-scan.sh"
    "scripts/verify-clean-repo.sh"
    "scripts/verify-live-exposure.sh"
    "scripts/verify-netlify-forms.sh"
    "scripts/verify-b2-design-save.sh"
    "scripts/verify-public-builder-wizard.sh"
    "scripts/verify-mosaic-clean-preprocess.sh"
    "scripts/verify-mosaic-clean-category-profiles.sh"
    "scripts/verify-photo-suitability-coach.sh"
    "scripts/verify-detail-priority-map.sh"
  )
  for script in "${scripts[@]}"; do
    echo "## $script" >> "$VERIFICATION_CAPTURE"
    echo >> "$VERIFICATION_CAPTURE"
    if [[ ! -f "$script" ]]; then
      echo "Status: not present" >> "$VERIFICATION_CAPTURE"
      echo >> "$VERIFICATION_CAPTURE"
      continue
    fi
    echo '```text' >> "$VERIFICATION_CAPTURE"
    if bash "$script" >> "$VERIFICATION_CAPTURE" 2>&1; then
      echo '```' >> "$VERIFICATION_CAPTURE"
      echo "Result: PASS" >> "$VERIFICATION_CAPTURE"
    else
      local status=$?
      echo '```' >> "$VERIFICATION_CAPTURE"
      echo "Result: FAIL (exit $status)" >> "$VERIFICATION_CAPTURE"
    fi
    echo >> "$VERIFICATION_CAPTURE"
  done
}

write_verification_markdown() {
  local dest="$1"
  {
    echo "# Verification"
    echo
    echo "Generated: $TIMESTAMP"
    echo
    echo "## Common Scripts"
    echo
    local scripts=(
      "scripts/security-scan.sh"
      "scripts/verify-clean-repo.sh"
      "scripts/verify-live-exposure.sh"
      "scripts/verify-netlify-forms.sh"
      "scripts/verify-b2-design-save.sh"
      "scripts/verify-public-builder-wizard.sh"
      "scripts/verify-mosaic-clean-preprocess.sh"
      "scripts/verify-mosaic-clean-category-profiles.sh"
      "scripts/verify-photo-suitability-coach.sh"
      "scripts/verify-detail-priority-map.sh"
    )
    for script in "${scripts[@]}"; do
      if [[ -f "$script" ]]; then
        echo "- \`$script\`: exists"
      else
        echo "- \`$script\`: not present"
      fi
    done
    echo
    if [[ "$RUN_VERIFICATION" -eq 1 ]]; then
      echo "## Captured Output"
      echo
      cat "$VERIFICATION_CAPTURE"
    else
      echo "## Captured Output"
      echo
      echo "Not run by handoff script. Use \`--run-verification\` to capture verification output here."
    fi
  } > "$dest/VERIFICATION.md"
}

write_files_changed_markdown() {
  local dest="$1"
  {
    echo "# Files Changed"
    echo
    if [[ -n "$BRANCH_SCOPE_WARNING" ]]; then
      echo "$BRANCH_SCOPE_WARNING"
      echo
    fi
    echo "## Previous Commit"
    echo
    echo '```text'
    if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
      run_or_blank git diff --name-status HEAD~1..HEAD
    else
      echo "HEAD~1 not available"
    fi
    echo '```'
    echo
    echo "## Branch Against main"
    echo
    echo '```text'
    if git show-ref --verify --quiet refs/heads/main; then
      run_or_blank git diff --name-status main...HEAD
    else
      echo "main branch not available locally"
    fi
    echo '```'
    echo
    echo "## Dirty Tracked Files"
    echo
    echo '```text'
    run_or_blank git diff --name-status
    echo '```'
    echo
    echo "## Untracked Files"
    echo
    echo '```text'
    run_or_blank git ls-files --others --exclude-standard
    echo '```'
    echo
    if git ls-files --others --exclude-standard | grep -E 'docs/.+\.md$' >/dev/null 2>&1; then
      echo "Warning: important untracked docs may not be visible to GitHub/ChatGPT unless committed."
      echo
    fi
    group_file_list "public/" '^public/'
    group_file_list "netlify/functions/" '^netlify/functions/'
    group_file_list "scripts/" '^scripts/'
    group_file_list "docs/" '^docs/'
    group_file_list "config/root files" '^([^/]+$|\.github/)'
    echo "## Generated Review References"
    echo
    if [[ -n "$INCLUDE_TMP_REVIEW" ]]; then
      echo "- \`$INCLUDE_TMP_REVIEW\`"
    else
      echo "- None supplied"
    fi
  } > "$dest/FILES_CHANGED.md"
}

write_artifacts_markdown() {
  local dest="$1"
  {
    echo "# Artifacts"
    echo
    if [[ "$ZIP_CREATED" -eq 1 ]]; then
      echo "- Review ZIP path: \`$ZIP_PATH\`"
      echo "- Review folder path: \`$OUT_DIR\`"
    else
      echo "- Review ZIP path: not created"
      echo "- Review folder path: not created"
    fi
    echo "- Preview URL: [Paste preview URL here if applicable]"
    echo "- Netlify deploy URL: [Paste deploy URL here if applicable]"
    echo
    echo "## Generated Visual Review"
    echo
    cat "$ARTIFACT_FACTS"
    echo
    echo "## Warnings"
    echo
    echo "- Generated visuals may include private QA-derived images."
    echo "- Do not commit generated review images unless explicitly approved."
    echo "- Upload a ZIP only if ChatGPT needs visual artifact review."
    if [[ -s "$GENERATED_WARNINGS" ]]; then
      sed 's/^/- /' "$GENERATED_WARNINGS"
    fi
  } > "$dest/ARTIFACTS.md"
}

write_review_handoff_markdown() {
  local dest="$1"
  {
    echo "# MosaPack ChatGPT Review Handoff"
    echo
    echo "## Summary"
    echo
    echo "This branch adds the ChatGPT review handoff workflow, including a review-package generator, link-first committed reports, review protocol docs, PR template, and preserved source research document. It does not change public app behavior."
    echo
    echo "## Repo"
    echo
    echo "- Path: \`$ROOT_DIR\`"
    echo "- Branch: \`${BRANCH:-unknown}\`"
    echo "- Source commit reviewed: \`$COMMIT\`"
    echo "- Report commit: generated after this report is committed"
    echo "- Timestamp: \`$TIMESTAMP\`"
    echo "- Production URL: https://mosapack.netlify.app"
    echo "- Preview URL: [Paste preview URL here if applicable]"
    echo "- GitHub branch/PR link: [Paste GitHub link here after push]"
    echo
    if [[ -n "$BRANCH_SCOPE_WARNING" ]]; then
      echo "## Scope Warning"
      echo
      echo "$BRANCH_SCOPE_WARNING"
      echo
    fi
    echo "## What Changed"
    echo
    group_file_list "Public app files" '^public/'
    group_file_list "Functions" '^netlify/functions/'
    group_file_list "Scripts" '^scripts/'
    group_file_list "Docs" '^docs/'
    group_file_list "Config/root files" '^([^/]+$|\.github/)'
    echo "### Generated visual artifacts"
    echo
    if [[ -n "$INCLUDE_TMP_REVIEW" ]]; then
      echo "- Referenced only, not committed: \`$INCLUDE_TMP_REVIEW\`"
    else
      echo "- None referenced"
    fi
    echo
    echo "## Review Focus"
    echo
    echo "- Inspect changed files, docs, scripts, and report metadata for correctness."
    echo "- Confirm no public app behavior, checkout/payment flow, B2 save behavior, or Netlify Forms behavior regressed."
    echo "- Confirm generated visual artifacts are referenced only unless explicitly approved for upload/hosting."
    echo "- Risk areas: repo hygiene, secret scanning, review artifact completeness, and stale local-only files."
    echo
    echo "## Verification Summary"
    echo
    echo "See [VERIFICATION.md](VERIFICATION.md)."
    echo
    echo "## Artifacts"
    echo
    echo "See [ARTIFACTS.md](ARTIFACTS.md)."
    echo
    echo "## Production Recommendation"
    echo
    echo "No production deploy unless explicitly approved by Derek."
    echo
    echo "## Next Recommended Task"
    echo
    echo "[Fill in after ChatGPT review.]"
  } > "$dest/REVIEW_HANDOFF.md"
}

write_status_files() {
  local dest="$1"
  {
    echo "Status before report generation"
    echo
    if [[ -s "$PRE_STATUS" ]]; then
      cat "$PRE_STATUS"
    else
      echo "No tracked or untracked changes before report generation."
    fi
    echo
    echo "Report files are generated after this status snapshot."
  } > "$dest/GIT_STATUS.txt"
  {
    echo "Diff before report generation"
    echo
    if [[ -s "$PRE_DIFF_STAT" ]]; then
      cat "$PRE_DIFF_STAT"
    else
      echo "No diff existed before report generation."
    fi
    echo
    echo "Report files are generated after this diff snapshot."
  } > "$dest/DIFF_STAT.txt"
  cat > "$dest/NEXT_PROMPT.md" <<'PROMPT'
# Next Codex Prompt Draft

Paste or edit this section after ChatGPT review.

## Context

- Repo:
- Branch:
- Commit:
- Preview:
- Current decision:

## Task

[Fill in after ChatGPT review.]

## Do not

- production deploy unless approved
- add checkout/payment unless approved
- expose public quality scores
- break B2 save
- break Netlify Forms
PROMPT
}

write_report_dir() {
  local dest="$1"
  rm -rf "$dest"
  mkdir -p "$dest"
  write_review_handoff_markdown "$dest"
  write_files_changed_markdown "$dest"
  write_verification_markdown "$dest"
  write_status_files "$dest"
  write_artifacts_markdown "$dest"
}

make_changed_file_union
capture_pre_report_state
detect_branch_scope_warning
inspect_generated_review_folder

if [[ "$REPORT_ONLY" -eq 0 ]]; then
  create_zip_package
fi

UNTRACKED_COUNT="$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')"

if [[ "$RUN_VERIFICATION" -eq 1 ]]; then
  run_verification_capture
fi

if [[ "$COMMIT_REPORT" -eq 1 ]]; then
  write_report_dir "$LATEST_REPORT_DIR"
  if [[ "$TIMESTAMPED" -eq 1 ]]; then
    write_report_dir "$TIMESTAMPED_REPORT_DIR"
  fi
fi

if [[ "$ZIP_CREATED" -eq 1 ]]; then
  FILE_COUNT="$(find "$OUT_DIR" -type f | wc -l | tr -d ' ')"
  echo "ChatGPT review package folder: $OUT_DIR"
  echo "ChatGPT review package zip: $ZIP_PATH"
  echo "Included file count: $FILE_COUNT"
fi
if [[ "$COMMIT_REPORT" -eq 1 ]]; then
  echo "Review report folder: $LATEST_REPORT_DIR"
  if [[ "$TIMESTAMPED" -eq 1 ]]; then
    echo "Timestamped review report folder: $TIMESTAMPED_REPORT_DIR"
  fi
fi
if [[ "$UNTRACKED_COUNT" -gt 0 ]]; then
  echo "Warning: untracked files exist."
fi
if [[ "$SECRET_SCAN_FOUND" -eq 1 ]]; then
  echo "Warning: secret-pattern hits found. Review $SECRET_HITS"
fi
