#!/usr/bin/env bash
# PostToolUse hook: after an edit to business-logic code (or its tests), run the unit suite.
# Exit 2 on failure so Claude sees the failing output and fixes it before moving on.
file=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')

case "$file" in
    */src/mapper/*.ts|*/src/service/*.ts|*/src/controllers/*.ts|*/src/utils/*.ts|*/src/models/*.ts|*/src/routes/*.ts|*/src/test/unit/*.ts) ;;
    *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0

if ! output=$(npm run --silent test:unit -- --reporter dot 2>&1); then
    echo "Unit tests failed after editing ${file#"$CLAUDE_PROJECT_DIR"/}. Fix them before continuing:" >&2
    echo "$output" | tail -60 >&2
    exit 2
fi
