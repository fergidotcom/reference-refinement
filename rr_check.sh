#!/usr/bin/env bash
set -euo pipefail
ROOT="$HOME/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References"
cd "$ROOT"
echo -n "Local health:  "; curl -fsS http://127.0.0.1:8000/api/health && echo
if [[ -s tunnel_url.txt ]]; then
  echo -n "Tunnel:        "; cat tunnel_url.txt
  echo -n "Tunnel health: "; curl -fsS "$(cat tunnel_url.txt)/api/health" && echo
else
  echo "Tunnel:        (no tunnel_url.txt)"
fi
echo "-- last 5 tunnel log lines --"
tail -n 5 /tmp/rr_cf.log 2>/dev/null || true
