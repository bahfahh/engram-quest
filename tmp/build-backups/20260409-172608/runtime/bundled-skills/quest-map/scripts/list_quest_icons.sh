#!/bin/bash
# List all available AI-generated generic gamified icons
PLUGIN_DIR=".obsidian/plugins/engram-quest"
if [ -d "$PLUGIN_DIR/assets/quest-map/icons" ]; then
    ls -1 "$PLUGIN_DIR/assets/quest-map/icons/" 2>/dev/null
else
    echo "Files not found. Use fallback emoji."
fi
