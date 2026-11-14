#!/bin/bash
# search_vault.sh — Search vault markdown files for personal context
# Usage: bash scripts/search_vault.sh "keyword1 keyword2" [limit]
# Multiple keywords are matched with OR logic.
#
# Windows note: always invoke as `bash scripts/search_vault.sh ...`
# Running the .sh file directly on Windows will open it in an editor instead of executing it.

# Self-re-exec guard: if not running under bash, re-invoke with bash
if [ -z "$BASH_VERSION" ]; then
  exec bash "$0" "$@"
fi

QUERY="${1:?Error: query required. Usage: bash search_vault.sh \"keyword\" [limit]}"
LIMIT="${2:-20}"

# Convert space-separated keywords to escaped grep OR pattern
PATTERN=$(echo "$QUERY" | tr ' ' '\n' | sed 's/[.[\*^$()+?{}|\\]/\\&/g' | paste -sd '|')

# Find vault root (4 levels up from scripts/)
VAULT_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

# Dot-folders (.obsidian, .git, and the AI tools' own .claude / .agents / .gemini / .cursor, where these
# skills are installed) hold no notes; searching them would return the skill files themselves.
# The vault's top-level engram-quest/ holds plugin data and the user's custom area (preferences, assets): not notes
# either. It is filtered by path, so a note folder of the same name deeper in the vault is still searched.
grep -ri --include="*.md" \
  --exclude-dir=".*" \
  --exclude-dir="node_modules" \
  --exclude-dir="engram-review" \
  -E "$PATTERN" \
  -B 2 -A 2 \
  "$VAULT_ROOT" \
  | grep -v -F -- "$VAULT_ROOT/engram-quest/" \
  | head -n $((LIMIT * 6))
