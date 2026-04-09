#!/bin/bash
# search_vault.sh — Search Obsidian vault for notes matching a tag or keyword
# Usage: bash scripts/search_vault.sh "keyword" [limit]
# Requires Obsidian to be running in the background.

QUERY="${1:?Error: query required. Usage: bash search_vault.sh \"keyword\" [limit]}"
LIMIT="${2:-20}"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; & obsidian 'search:context' 'query=$QUERY' 'limit=$LIMIT'"
else
    obsidian search:context query="$QUERY" limit="$LIMIT"
fi
