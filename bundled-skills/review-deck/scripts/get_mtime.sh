#!/bin/bash
# get_mtime.sh — Get file mtime in milliseconds (cross-platform)
# Usage: bash scripts/get_mtime.sh "path/to/note.md"

FILE="${1:?Error: file path required. Usage: bash get_mtime.sh \"path/to/note.md\"}"

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OS" == "Windows_NT" ]]; then
    powershell -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; (Get-Item '$FILE').LastWriteTimeUtc.ToUnixTimeMilliseconds()"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo $(($(stat -f %m "$FILE") * 1000))
else
    echo $(($(stat -c %Y "$FILE") * 1000))
fi
