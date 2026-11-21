#!/usr/bin/env bash
set -euo pipefail

# E. Safe schema migration (with rollback on failure)
if ! docker compose -f docker-compose.prod.yml run --rm --no-deps --interactive=false -T api node dist/prepare-database.js migrate </dev/null; then
  echo "❌ Schema migration failed! Triggering safe rollback..."
  node scripts/rollback.mjs
  exit 1
fi

# F. Rolling container update (with rollback on failure)
if ! docker compose -f docker-compose.prod.yml up -d --remove-orphans --wait --wait-timeout 120; then
  echo "❌ Container update failed! Triggering safe rollback..."
  node scripts/rollback.mjs
  exit 1
fi

echo "DEPLOY_UPDATED"
# Read the manifest digests from the running containers' image IDs.
for service in api web; do
  expected=$(node scripts/safe-env.mjs get .env "${service^^}_IMAGE_REF")
  container=$(docker compose -f docker-compose.prod.yml ps -q "$service")
  if ! image_id=$(docker inspect --format '{{.Image}}' "$container") ||
     ! docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$image_id" | grep -Fx -- "$expected"; then
    echo "Unexpected running image for $service. Rolling back."
    node scripts/rollback.mjs
    exit 1
  fi
  echo "DEPLOY_RUNNING $service $expected"
done

# G. Production Smoke Test with real configured DOMAIN (FIX-13)
echo "Running smoke test against configured domain: https://$DOMAIN"
if ! TARGET_ENV=production TARGET_URL="https://$DOMAIN" node scripts/smoke-test.mjs; then
  echo "❌ Smoke test failed against https://$DOMAIN! Triggering automatic safe rollback..."
  node scripts/rollback.mjs
  exit 1
fi
echo "DEPLOY_SMOKE https://$DOMAIN"
