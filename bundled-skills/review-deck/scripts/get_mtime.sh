#!/bin/bash
# get_mtime.sh — Get file mtime in milliseconds (cross-platform)
# Usage: bash scripts/get_mtime.sh "path/to/note.md"
# Prints whole milliseconds on every OS, so values recorded on one machine compare with another.

set -eu

FILE="${1:?Error: file path required. Usage: bash get_mtime.sh \"path/to/note.md\"}"

if [[ ! -f "$FILE" ]]; then
    echo "Error: file not found: $FILE" >&2
    exit 1
fi

# "12345.678901" (seconds with a fraction) -> "12345678" (milliseconds); prints nothing if not that shape.
to_ms() {
    local secs="${1%%.*}" frac="${1#*.}"
    [[ "$1" == *.* && "$secs" =~ ^[0-9]+$ && "$frac" =~ ^[0-9]+$ ]] || return 0
    frac="${frac}000"
    echo $((10#$secs * 1000 + 10#${frac:0:3}))
}

# $OS and $OSTYPE are unset on many shells; default them so `set -u` does not abort.
if [[ "${OSTYPE:-}" == "msys" || "${OSTYPE:-}" == "cygwin" || "${OS:-}" == "Windows_NT" ]]; then
    # PowerShell single-quoted string: ' must be doubled (' → '')
    ESCAPED="${FILE//\'/\'\'}"
    powershell -NoProfile -Command "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ([DateTimeOffset](Get-Item '$ESCAPED' -ErrorAction Stop).LastWriteTimeUtc).ToUnixTimeMilliseconds()"
elif [[ "${OSTYPE:-}" == "darwin"* ]]; then
    MS=$(to_ms "$(stat -f %Fm "$FILE" 2>/dev/null || true)")
    if [[ -n "$MS" ]]; then echo "$MS"; else echo $(( $(stat -f %m "$FILE") * 1000 )); fi
else
    MS=$(to_ms "$(stat -c %.3Y "$FILE" 2>/dev/null || true)")
    if [[ -n "$MS" ]]; then echo "$MS"; else echo $(( $(stat -c %Y "$FILE") * 1000 )); fi
fi
