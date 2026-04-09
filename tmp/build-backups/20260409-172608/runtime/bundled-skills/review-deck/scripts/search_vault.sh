#!/bin/bash
# search_vault.sh — Search Obsidian vault for related notes (cross-platform)
# Usage: bash scripts/search_vault.sh "keyword" [limit]
# Requires Obsidian to be running in the background.

QUERY="${1:?Error: query required. Usage: bash search_vault.sh \"keyword\" [limit]}"
LIMIT="${2:-5}"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    # Windows (Git Bash): obsidian colon commands fail in bash, route via PowerShell
    powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & obsidian 'search:context' 'query=$QUERY' 'limit=$LIMIT'"
else
    # macOS / Linux: call obsidian directly
    obsidian search:context query="$QUERY" limit="$LIMIT"
fi
