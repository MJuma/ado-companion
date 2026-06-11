#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

MODE="${1:-}"
CHANGESET_DIR=".changeset"
PACKAGE_JSON="packages/extension/package.json"

count_changesets() {
    if [[ ! -d "$CHANGESET_DIR" ]]; then
        echo "0"
        return
    fi
    find "$CHANGESET_DIR" -maxdepth 1 -name '*.md' ! -name 'README.md' | wc -l | tr -d ' '
}

has_version_bump() {
    local target_ref="$1"
    local current_version
    current_version=$(node -p "require('./${PACKAGE_JSON}').version")
    local target_version
    target_version=$(git show "${target_ref}:${PACKAGE_JSON}" 2>/dev/null | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).version" 2>/dev/null || echo "")
    if [[ -z "$target_version" ]]; then
        return 0
    fi
    [[ "$current_version" != "$target_version" ]]
}

# PR mode — require a consumed changeset (version bump) for extension changes
if [[ "$MODE" == "pr" ]]; then
    TARGET_REF="origin/${GITHUB_BASE_REF:-master}"

    if ! git rev-parse --verify "$TARGET_REF" >/dev/null 2>&1; then
        echo "❌ Cannot resolve target ref '${TARGET_REF}'. Ensure fetch-depth: 0."
        exit 1
    fi

    CHANGED_FILES=$(git diff --name-only "${TARGET_REF}...HEAD" -- 'packages/extension/')
    if [[ -z "$CHANGED_FILES" ]]; then
        echo "✅ No extension changes detected — changeset not required."
        exit 0
    fi

    echo "📦 Extension files changed:"
    echo "$CHANGED_FILES" | head -10
    echo ""

    CHANGESET_COUNT=$(count_changesets)
    if [[ "$CHANGESET_COUNT" -gt 0 ]]; then
        echo "⚠️  Found $CHANGESET_COUNT unconsumed changeset file(s)."
        echo "Run 'pnpm changeset:version' to bump the version and consume them before merging."
        exit 1
    fi

    if has_version_bump "$TARGET_REF"; then
        echo "✅ Version bump detected in ${PACKAGE_JSON} — changeset already consumed."
        exit 0
    fi

    echo "❌ No changeset or version bump found."
    echo ""
    echo "To prepare this PR for release:"
    echo "  1. Run 'pnpm changeset' to create a changeset file"
    echo "  2. Run 'pnpm changeset:version' to bump the version + update CHANGELOG"
    echo "  3. Commit both the version bump and changelog"
    exit 1

# Version mode — print the current extension version (used by release workflow)
elif [[ "$MODE" == "version" ]]; then
    node -p "require('./${PACKAGE_JSON}').version"

else
    echo "Usage: check-changeset.sh <pr|version>"
    exit 1
fi
