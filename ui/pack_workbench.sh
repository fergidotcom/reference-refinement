#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
OUT="dist/single_record_workbench_load_plan_run_fixed.jsx"
{
  echo '// Reference Refinement — Single-file build (packed from ui/src)'
  echo '// Notes: BASE_URL defaults to https://localhost:8443'
  echo
  cat src/components/Section.tsx
  echo
  cat src/components/UI.tsx
  echo
  cat src/hooks/useDebounced.ts
  echo
  cat src/utils/api.ts
  echo
  cat src/App.tsx
} > "$OUT"
echo "Packed -> $OUT"
