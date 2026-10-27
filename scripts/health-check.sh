#!/usr/bin/env bash
# ==============================================================================
# DevOps IA-3: HTTP Health Check & Verification Script
# Author: Francis | Project: DevOps IA-3 Academic Project
# ==============================================================================
set -euo pipefail

TARGET_HOST="${1:-${AZURE_VM_HOST:-20.219.161.235}}"
HEALTH_URL="http://${TARGET_HOST}"
MAX_RETRIES=5
RETRY_INTERVAL=3

echo "=========================================================="
echo " Initiating Health Check on: $HEALTH_URL"
echo "=========================================================="

ATTEMPT=1
SUCCESS=0

while [ "$ATTEMPT" -le "$MAX_RETRIES" ]; do
    echo "Attempt $ATTEMPT of $MAX_RETRIES: Probing $HEALTH_URL..."
    
    # Perform HTTP request and capture HTTP status code
    HTTP_CODE=$(curl -s -o /tmp/health_response.html -w "%{http_code}" --max-time 10 "$HEALTH_URL" || echo "000")
    
    echo "-> HTTP Response Status Code: $HTTP_CODE"

    if [ "$HTTP_CODE" -eq 200 ]; then
        if grep -qiE "(DevOps|EduPulse|Student)" /tmp/health_response.html; then
            echo "✔ Content validation passed: Application signature verified."
            SUCCESS=1
            break
        else
            echo "⚠ Warning: Received 200 OK, but signature content not yet detected."
        fi
    else
        echo "⚠ Endpoint returned non-200 code ($HTTP_CODE). Retrying in ${RETRY_INTERVAL}s..."
    fi

    ATTEMPT=$((ATTEMPT + 1))
    sleep "$RETRY_INTERVAL"
done

rm -f /tmp/health_response.html

if [ "$SUCCESS" -eq 1 ]; then
    echo "=========================================================="
    echo "✔ HEALTH CHECK PASSED: Service is healthy and serving content."
    echo "=========================================================="
    exit 0
else
    echo "=========================================================="
    echo "❌ HEALTH CHECK FAILED: Service did not respond with 200 OK after $MAX_RETRIES attempts."
    echo "=========================================================="
    exit 1
fi
