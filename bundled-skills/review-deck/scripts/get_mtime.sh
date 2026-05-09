#!/bin/bash
# get_mtime.sh — Get file mtime in milliseconds (cross-platform)
# Usage: bash scripts/get_mtime.sh "path/to/note.md"

set -eu

FILE="${1:?Error: file path required. Usage: bash get_mtime.sh \"path/to/note.md\"}"

if [[ ! -f "$FILE" ]]; then
    echo "Error: file not found: $FILE" >&2
    exit 1
fi

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    # PowerShell single-quoted string: ' must be doubled (' → '')
    ESCAPED="${FILE//\'/\'\'}"
    powershell -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ([DateTimeOffset](Get-Item '$ESCAPED' -ErrorAction Stop).LastWriteTimeUtc).ToUnixTimeMilliseconds()"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    SECS=$(stat -f %m "$FILE")
    echo $((SECS * 1000))
else
    SECS=$(stat -c %Y "$FILE")
    echo $((SECS * 1000))
fi
