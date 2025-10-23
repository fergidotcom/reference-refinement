#!/usr/bin/env bash
set -euo pipefail
ROOT="$HOME/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References"
cd "$ROOT"
( deactivate 2>/dev/null || true ); source .venv/bin/activate 2>/dev/null || true
# kill old, clean logs
pkill -f 'uvicorn.*127\.0\.0\.1:8000' 2>/dev/null || true
pkill -f 'cloudflared tunnel' 2>/dev/null || true
rm -f tunnel_url.txt /tmp/rr_backend.log /tmp/rr_cf.log /tmp/rr_cf.pid /tmp/rr_uvicorn.pid

# start backend
nohup python -m uvicorn ref_canvas_backend_v52_patch:app --host 127.0.0.1 --port 8000 \
  > /tmp/rr_backend.log 2>&1 & echo $! > /tmp/rr_uvicorn.pid

# wait for local health
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:8000/api/health >/dev/null; then
    echo "Local backend OK"; break
  fi; sleep 0.5
done

# start cloudflared (background)
nohup cloudflared tunnel --url http://127.0.0.1:8000 --edge-ip-version auto --no-autoupdate \
  > /tmp/rr_cf.log 2>&1 & echo $! > /tmp/rr_cf.pid

# wait for tunnel url to appear in log
for i in {1..120}; do
  URL="$(grep -o 'https://[^ ]*trycloudflare\.com' /tmp/rr_cf.log | head -n1 || true)"
  if [[ -n "${URL:-}" ]]; then echo "$URL" > tunnel_url.txt; break; fi
  sleep 1
done
[[ -s tunnel_url.txt ]] || { echo "ERROR: tunnel URL not found"; exit 1; }

TUN="$(cat tunnel_url.txt)"
# wait for tunnel health
for i in {1..30}; do
  if curl -fsS "$TUN/api/health" >/dev/null; then
    echo "Tunnel OK: $TUN"; break
  fi; sleep 2
done

echo "One-time teach URL:"
echo "https://rrv521-1760738877.netlify.app/?api=$TUN"
