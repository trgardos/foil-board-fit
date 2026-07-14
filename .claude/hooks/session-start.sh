#!/bin/bash
# SessionStart hook for foil-board-fit.
#
# This is a deliberately zero-dependency static site (see CLAUDE.md), so there
# is nothing to `npm install`. Instead this hook just makes sure the tools a
# session needs are present and does a cheap, dependency-free sanity check on
# the JavaScript. Runs synchronously so the session starts in a known-good state.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

echo "[session-start] foil-board-fit — zero-dependency static site, nothing to install."

# Node is used only for the syntax check below (never shipped to the site).
if command -v node >/dev/null 2>&1; then
  if node --check app.js; then
    echo "[session-start] node --check app.js: OK"
  else
    echo "[session-start] WARNING: node --check app.js reported a syntax error (see above)."
  fi
else
  echo "[session-start] node not found — skipping JS syntax check."
fi

# python3 gives a zero-dependency local preview server: python3 -m http.server 8000
if command -v python3 >/dev/null 2>&1; then
  echo "[session-start] Preview locally with: python3 -m http.server 8000  (then open http://localhost:8000/)"
else
  echo "[session-start] python3 not found — open index.html directly in a browser to preview."
fi

# Never fail the session on a lint warning; this hook is prep, not a gate.
exit 0
