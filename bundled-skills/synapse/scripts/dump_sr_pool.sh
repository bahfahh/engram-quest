#!/usr/bin/env bash
# Wrapper so the existing installer rewrite (`bash scripts/...` →
# `bash {targetRoot}/scripts/...`) handles path resolution. Delegates to the
# Node implementation in the same directory.
exec node "$(dirname "$0")/dump_sr_pool.js"
