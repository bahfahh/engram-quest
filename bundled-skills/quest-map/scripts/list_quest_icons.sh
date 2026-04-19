#!/bin/bash
# List all available AI-generated generic gamified icons
VAULT_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
ICON_DIR="$VAULT_ROOT/.obsidian/plugins/engram-quest/assets/quest-map/icons"
if [ -d "$ICON_DIR" ]; then
    ls -1 "$ICON_DIR/" 2>/dev/null
else
    echo "Files not found. Use fallback emoji."
fi
