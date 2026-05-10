#!/usr/bin/env bash
# Wrapper so the existing installer rewrite (`bash scripts/...` →
# `bash {targetRoot}/scripts/...`) handles path resolution. Delegates to the
# Node implementation in the same directory.
#
# Pass `--full` to force a full rebuild even when _status.json indicates
# incremental would be sufficient.
#
# Exits 3 with a structured JSON error on stderr if `node` is not available;
# the SKILL.md "If `node` is not available" section explains the fallback path.

if ! command -v node >/dev/null 2>&1; then
  printf '{"mode":"error","error":"node-not-found","message":"Install Node.js >= 18, or use the fallback path described in SKILL.md Step 1."}\n' >&2
  exit 3
fi

exec node "$(dirname "$0")/dump_sr_pool.js" "$@"
