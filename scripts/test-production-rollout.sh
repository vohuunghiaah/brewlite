#!/usr/bin/env bash
set -euo pipefail

src=$(cd "$(dirname "$0")" && pwd)
work=$(mktemp -d)
cd "$work"
export COMPOSE_PROJECT_NAME="brewlite-rollout-${RANDOM}-$$"
export DOMAIN=fixture.invalid
compose=(docker compose -f docker-compose.prod.yml)
cleanup() {
  "${compose[@]}" down
  rm -rf -- "$work"
}
trap cleanup EXIT

# No published ports, volumes, host mounts, database or external smoke requests.
cat > docker-compose.prod.yml <<'YAML'
services:
  api:
    image: alpine:3.22
    network_mode: none
    entrypoint:
      - sh
      - -c
      - 'if [ "$$0" = node ]; then sleep 1; echo MIGRATED; else exec sleep 300; fi'
    command: ["serve"]
  web:
    image: alpine:3.22
    network_mode: none
    command: ["sleep", "300"]
YAML
"${compose[@]}" pull
export API_IMAGE_REF WEB_IMAGE_REF
API_IMAGE_REF=$(docker image inspect alpine:3.22 --format '{{index .RepoDigests 0}}')
WEB_IMAGE_REF=$API_IMAGE_REF
printf 'API_IMAGE_REF=%s\nWEB_IMAGE_REF=%s\n' "$API_IMAGE_REF" "$WEB_IMAGE_REF" > .env
mkdir scripts
cp "$src/safe-env.mjs" scripts/
cat > scripts/smoke-test.mjs <<'JS'
import assert from 'node:assert/strict';
assert.equal(process.env.TARGET_ENV, 'production');
assert.equal(process.env.TARGET_URL, 'https://fixture.invalid');
process.exit(process.env.FAIL_SMOKE === 'true' ? 1 : 0);
JS
echo "console.log('ROLLBACK_REQUESTED')" > scripts/rollback.mjs

# SSH delivers the remote bash script over a non-seekable pipe. The old
# interactive Compose client drains the following command even on exit 0.
printf '%s\n' 'set -e' \
  'docker compose -f docker-compose.prod.yml run --rm --no-deps api node dist/prepare-database.js migrate' \
  'echo DEPLOY_UPDATED' | bash -s > old.log
grep -Fx MIGRATED old.log
if grep -Fxq DEPLOY_UPDATED old.log || bash "$src/verify-production-output.sh" old.log; then
  echo 'Expected the original false success after migration' >&2
  exit 1
fi
echo 'PASS: original Compose command swallowed the remaining script and exited zero'

# Pipe the actual rollout script to bash so the migration must preserve stdin.
cat "$src/rollout-production.sh" | bash -s > good.log
bash "$src/verify-production-output.sh" good.log
echo 'PASS: migration, container update, both running image digests and smoke verified'

for omitted in 'DEPLOY_UPDATED' 'DEPLOY_RUNNING api' 'DEPLOY_RUNNING web' 'DEPLOY_SMOKE'; do
  grep -v "^$omitted" good.log > incomplete.log
  if bash "$src/verify-production-output.sh" incomplete.log; then exit 1; fi
done

if FAIL_SMOKE=true bash "$src/rollout-production.sh" > failed.log; then exit 1; fi
grep -Fx ROLLBACK_REQUESTED failed.log
if bash "$src/verify-production-output.sh" failed.log; then exit 1; fi
echo 'WEB_IMAGE_REF=wrong.example/web@sha256:unexpected' > .env
printf 'API_IMAGE_REF=%s\n' "$API_IMAGE_REF" >> .env
if bash "$src/rollout-production.sh" > mismatch.log; then exit 1; fi
grep -Fx ROLLBACK_REQUESTED mismatch.log
if bash "$src/verify-production-output.sh" mismatch.log; then exit 1; fi
echo 'PASS: missing checkpoints, a failed smoke and a mismatched image are rejected'
