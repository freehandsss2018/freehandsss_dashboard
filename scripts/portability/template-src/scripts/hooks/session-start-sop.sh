#!/usr/bin/env sh
# Optional shell wrapper; project hook settings call the Node entry point.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec node "$SCRIPT_DIR/session-start-sop.js"
