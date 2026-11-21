#!/usr/bin/env bash
# Run on the Actions runner, independently of the remote shell's exit status.
set -eu
expected=$(printf '%s\n' "DEPLOY_UPDATED" "DEPLOY_RUNNING api ${API_IMAGE_REF:?}" \
  "DEPLOY_RUNNING web ${WEB_IMAGE_REF:?}" "DEPLOY_SMOKE https://${DOMAIN:?}")
actual=$(grep '^DEPLOY_' "$1" || true)
if [[ "$actual" != "$expected" ]]; then
  echo "Missing or unexpected production evidence for the update, running image digests or HTTPS smoke." >&2
  exit 1
fi
