#!/usr/bin/env bash
pkill -f 'uvicorn.*127\.0\.0\.1:8000' 2>/dev/null || true
pkill -f 'cloudflared tunnel' 2>/dev/null || true
echo "Stopped backend and tunnel."
