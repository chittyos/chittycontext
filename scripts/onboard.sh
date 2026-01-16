#!/bin/bash
set -euo pipefail
echo "=== chittycontext Onboarding ==="
curl -s -X POST "${GETCHITTY_ENDPOINT:-https://get.chitty.cc/api/onboard}" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"chittycontext","organization":"CHITTYOS","type":"service","tier":3,"domains":["context.chitty.cc"]}' | jq .
