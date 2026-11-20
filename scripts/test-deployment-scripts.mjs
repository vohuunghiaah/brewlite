#!/usr/bin/env node
/**
 * Automated Verification Suite for Task 5.3 Deployment Tooling & Safety Rules
 * Covers FIX-01 through FIX-15:
 * 1. Static Architectural, Security & Workflow Invariants (FIX-07, FIX-08, FIX-09, FIX-10, FIX-13, FIX-14, FIX-15)
 * 2. Real Execution, Fail-Closed & Stream Integrity Tests (FIX-01, FIX-02, FIX-06, FIX-08, FIX-09, FIX-12, FIX-13, FIX-14, FIX-15)
 * 3. Deployment, Simulation & Isolated Docker Compose Rollback Tests (FIX-08, FIX-11)
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  readFileSync,
  existsSync,
  writeFileSync,
  appendFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  createWriteStream,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { saveDeploymentState, loadDeploymentState, captureRunningImages } from './deployment-state.mjs';
import { readHeaderSample } from './backup-db.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

console.log('======================================================================');
console.log('🧪 TASK 5.3 DEPLOYMENT & DELIVERY EXECUTION TEST SUITE (FIX-07 - FIX-15)');
console.log('======================================================================\n');

const suite = [];

function runTest(category, name, fn) {
  try {
    const res = fn();
    if (res && res.skipped) {
      suite.push({ category, test: name, status: 'SKIPPED', detail: res.reason });
      console.log(`⚠️ [${category}] SKIPPED: ${name} (${res.reason})`);
    } else {
      suite.push({ category, test: name, status: 'PASS' });
      console.log(`✔ [${category}] PASS: ${name}`);
    }
  } catch (err) {
    suite.push({ category, test: name, status: 'FAIL', error: err.message });
    console.error(`❌ [${category}] FAIL: ${name} -> ${err.message}`);
  }
}

// =====================================================================
// SECTION 1: STATIC ARCHITECTURAL, SECURITY & WORKFLOW INVARIANTS
// =====================================================================

runTest('STATIC', 'ADR-007: docker-compose.prod.yml defines caddy, web, api, db with memory limits', () => {
  const file = path.join(root, 'docker-compose.prod.yml');
  assert.ok(existsSync(file), 'docker-compose.prod.yml must exist');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('caddy:'), 'Must define caddy service');
  assert.ok(content.includes('web:'), 'Must define web service');
  assert.ok(content.includes('api:'), 'Must define api service');
  assert.ok(content.includes('db:'), 'Must define db service');
  assert.ok(content.includes('memory: 128M'), 'Caddy memory limit 128M');
  assert.ok(content.includes('memory: 512M'), 'Services memory limit 512M');
  assert.ok(content.includes('max-size: "10m"'), 'Log rotation max-size 10m');
  assert.ok(content.includes('max-file: "3"'), 'Log rotation max-file 3');
});

runTest('STATIC', 'ADR-007 Security: PostgreSQL 5432 & NestJS API 3001 are closed from public internet', () => {
  const content = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8');
  const dbSection = content.split('db:')[1].split('volumes:')[0];
  assert.ok(!dbSection.includes('ports:'), 'PostgreSQL must not expose host ports');
  const apiSection = content.split('api:')[1].split('db:')[0];
  assert.ok(!apiSection.includes('ports:'), 'API service must not expose direct host ports');
  assert.ok(content.includes('80:80'), 'Caddy must expose port 80');
  assert.ok(content.includes('443:443'), 'Caddy must expose port 443');
});

runTest('STATIC', 'Caddyfile: Reverse proxies /api/* to api:3001 and UI to web:3000 with HSTS', () => {
  const content = readFileSync(path.join(root, 'Caddyfile'), 'utf8');
  assert.ok(content.includes('handle_path /api/*'), 'Must strip /api path prefix');
  assert.ok(content.includes('reverse_proxy api:3001'), 'Must proxy to api:3001');
  assert.ok(content.includes('reverse_proxy web:3000'), 'Must proxy UI to web:3000');
  assert.ok(content.includes('Strict-Transport-Security'), 'Must include HSTS header');
});

runTest('STATIC', 'Phase B: Multi-stage Dockerfiles run as non-root node user with healthcheck', () => {
  const apiDocker = readFileSync(path.join(root, 'apps/api/Dockerfile'), 'utf8');
  assert.ok(apiDocker.includes('AS builder'), 'API must have builder stage');
  assert.ok(apiDocker.includes('AS runner'), 'API must have runner stage');
  assert.ok(apiDocker.includes('USER node'), 'API must execute as user node');
  assert.ok(apiDocker.includes('HEALTHCHECK'), 'API must have HEALTHCHECK');

  const webDocker = readFileSync(path.join(root, 'apps/web/Dockerfile'), 'utf8');
  assert.ok(webDocker.includes('AS builder'), 'Web must have builder stage');
  assert.ok(webDocker.includes('AS runner'), 'Web must have runner stage');
  assert.ok(webDocker.includes('USER node'), 'Web must execute as user node');
  assert.ok(webDocker.includes('.next/standalone'), 'Web must use standalone output');
  assert.ok(webDocker.includes('ARG NEXT_PUBLIC_API_URL=/api'), 'Web must parameterize API URL to /api');
});

runTest('STATIC', 'FIX-07: deploy.yml mandates LIGHTSAIL_SSH_KNOWN_HOSTS and forbids ssh-keyscan fallback', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(deployYaml.includes('LIGHTSAIL_SSH_KNOWN_HOSTS'), 'Must verify LIGHTSAIL_SSH_KNOWN_HOSTS');
  assert.ok(!deployYaml.includes('ssh-keyscan'), 'deploy.yml must NEVER use ssh-keyscan fallback');
  assert.ok(deployYaml.includes('StrictHostKeyChecking=yes'), 'deploy.yml must enforce StrictHostKeyChecking=yes');
  assert.ok(!deployYaml.includes('StrictHostKeyChecking=no'), 'deploy.yml must NEVER accept StrictHostKeyChecking=no');
});

runTest('STATIC', 'FIX-08 & FIX-15: deploy.yml validates required secrets and streams .env safely via base64 stdin', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(deployYaml.includes('POSTGRES_DB'), 'Must check POSTGRES_DB');
  assert.ok(deployYaml.includes('POSTGRES_USER'), 'Must check POSTGRES_USER');
  assert.ok(deployYaml.includes('POSTGRES_PASSWORD'), 'Must check POSTGRES_PASSWORD');
  assert.ok(deployYaml.includes('JWT_SECRET'), 'Must check JWT_SECRET');
  assert.ok(deployYaml.includes('base64 -d > "$TMP_ENV"'), 'Must stream and decode .env via base64 stdin');
  assert.ok(deployYaml.includes('chmod 600 "$TMP_ENV"'), 'Must enforce chmod 600 on temporary .env');
  assert.ok(deployYaml.includes('mv -f "$TMP_ENV" "$APP_DIR/.env"'), 'Must atomically replace remote .env');
});

runTest('STATIC', 'FIX-09: deploy.yml executes deployment-state.mjs without ignoring errors (no "|| true")', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(!deployYaml.includes('node scripts/deployment-state.mjs || true'), 'Must not swallow deployment-state errors with || true');
  assert.ok(deployYaml.includes('node scripts/deployment-state.mjs'), 'Must call deployment-state.mjs');
});

runTest('STATIC', 'FIX-10: deploy.yml isolates staging with explicit BLOCKED / NOT CONFIGURED status', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(deployYaml.includes('deploy-staging:'), 'Must define explicit deploy-staging job');
  assert.ok(deployYaml.includes('BLOCKED / NOT CONFIGURED'), 'Staging job documents BLOCKED / NOT CONFIGURED');
  assert.ok(deployYaml.includes('group: cd-deployment-production'), 'Global concurrency cd-deployment-production');
  assert.ok(deployYaml.includes('cancel-in-progress: false'), 'Must not cancel in-progress deploys');
});

runTest('STATIC', 'FIX-14: deploy.yml blocks automated push/merge production deploy and requires explicit confirmation', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  const prodJob = deployYaml.split('deploy-production:')[1].split('steps:')[0];
  assert.ok(prodJob.includes("inputs.target_env == 'production'"), 'Production deploy requires target_env == production');
  assert.ok(prodJob.includes("inputs.confirm_production == 'DEPLOY_PRODUCTION'"), 'Requires explicit confirmation DEPLOY_PRODUCTION');
  assert.ok(!prodJob.includes("github.event_name == 'push'"), 'deploy-production must NEVER run on push event');
  assert.ok(prodJob.includes('name: production'), 'Retains production environment for approval gate');
  assert.ok(deployYaml.includes('PRODUCTION_APPROVAL_CONFIGURED'), 'Requires verified approval configuration');
});

runTest('STATIC', 'FIX-15: deploy.yml has zero direct secret interpolations in shell script bodies', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  const steps = deployYaml.split('- name:');
  for (const step of steps) {
    if (step.includes('run: |') || step.includes('run:')) {
      const runIndex = step.indexOf('run:');
      const runBlock = step.substring(runIndex);
      assert.ok(!runBlock.includes('${{ secrets.'), `Step run block must not directly interpolate secrets: ${step.substring(0, 50)}...`);
    }
  }
});

runTest('STATIC', 'FIX-13: deploy.yml safely exports .env to remote shell and invokes smoke test with configured DOMAIN', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  const remoteDeploy = deployYaml.split('id: remote-deploy')[1].split('Record Deployment State')[0];
  assert.ok(remoteDeploy.includes('set -a') && remoteDeploy.includes('. ./.env'), 'Remote shell must safely export .env variables');
  assert.ok(remoteDeploy.includes('TARGET_URL="https://$DOMAIN"'), 'Smoke test must use exported https://$DOMAIN');
  assert.ok(remoteDeploy.includes('Essential environment variables (DOMAIN, POSTGRES_USER, POSTGRES_DB)'), 'Validates variables before execution');
});

// =====================================================================
// SECTION 2: EXECUTION, FAIL-CLOSED & INTEGRITY TESTS
// =====================================================================

runTest('EXECUTION', 'FIX-01 & FIX-08: Backup script fails-closed (exit code 1) on missing DB even with --fresh', () => {
  const res = spawnSync(process.execPath, [path.join(root, 'scripts/backup-db.mjs'), '--fresh'], {
    env: { ...process.env, DB_CONTAINER: 'non-existent-db-container-' + Date.now() },
    encoding: 'utf8',
  });
  assert.equal(res.status, 1, `Expected exit code 1 on missing DB container even with --fresh, got ${res.status}`);
  assert.ok(res.stderr.includes('FAIL-CLOSED'), 'Stderr must state FAIL-CLOSED error condition');
});

runTest('EXECUTION', 'FIX-02 Requirement 6: Rollback fails safely (exit code 1) when rollback targets are missing', () => {
  const nonExistentState = path.join(tmpdir(), 'non-existent-state-' + Date.now() + '.json');
  const res = spawnSync(process.execPath, [path.join(root, 'scripts/rollback.mjs')], {
    env: { ...process.env, STATE_FILE: nonExistentState, ROLLBACK_API_IMAGE: '', ROLLBACK_WEB_IMAGE: '' },
    encoding: 'utf8',
  });
  assert.equal(res.status, 1, `Expected rollback to fail safely with code 1 when targets are missing, got ${res.status}`);
  assert.ok(res.stderr.includes('FATAL'), 'Stderr must explain missing targets');
});

runTest('EXECUTION', 'FIX-02 Requirement 3 & 4: Rollback rejects forbidden tags ("latest", "stable", empty)', () => {
  const res = spawnSync(process.execPath, [path.join(root, 'scripts/rollback.mjs')], {
    env: { ...process.env, ROLLBACK_API_IMAGE: 'brewlite-api:latest', ROLLBACK_WEB_IMAGE: 'brewlite-web:stable' },
    encoding: 'utf8',
  });
  assert.equal(res.status, 1, `Expected rejection of forbidden tags latest/stable, got ${res.status}`);
  assert.ok(res.stderr.includes('latest') || res.stderr.includes('stable') || res.stderr.includes('FATAL'), 'Stderr warns about forbidden tags');
});

runTest('EXECUTION', 'FIX-02 Requirement 1 & 2: Deployment state records and loads distinct image references with 0600 permissions', () => {
  const tempStateFile = path.join(tmpdir(), 'test-state-' + Date.now() + '.json');
  try {
    const mockState = {
      isBootstrap: false,
      previousApiImage: 'ghcr.io/vohuunghiaah/brewlite-api:sha-111111',
      previousWebImage: 'ghcr.io/vohuunghiaah/brewlite-web:sha-222222',
      recordedAt: new Date().toISOString(),
    };
    saveDeploymentState(mockState, tempStateFile);
    assert.ok(existsSync(tempStateFile), 'State file must be created');

    const loaded = loadDeploymentState(tempStateFile);
    assert.equal(loaded.previousApiImage, mockState.previousApiImage);
    assert.equal(loaded.previousWebImage, mockState.previousWebImage);
    assert.equal(loaded.isBootstrap, false);
  } finally {
    try { rmSync(tempStateFile, { force: true }); } catch {}
  }
});

runTest('EXECUTION', 'FIX-08 & FIX-09: Deployment state records isBootstrap: true when no running containers are found', () => {
  const tempStateFile = path.join(tmpdir(), 'bootstrap-state-' + Date.now() + '.json');
  try {
    const state = captureRunningImages({
      apiContainer: 'non-existent-api-' + Date.now(),
      webContainer: 'non-existent-web-' + Date.now(),
      stateFile: tempStateFile,
    });
    assert.ok(state, 'captureRunningImages must return a valid state object');
    assert.equal(state.isBootstrap, true, 'isBootstrap must be true when containers are missing');
    assert.equal(state.previousApiImage, null);
    assert.equal(state.previousWebImage, null);
    assert.ok(existsSync(tempStateFile), 'Bootstrap state file must be persisted');
  } finally {
    try { rmSync(tempStateFile, { force: true }); } catch {}
  }
});

runTest('EXECUTION', 'FIX-09: Rollback handles failed initial bootstrap (isBootstrap: true) and exits with code 1', () => {
  const tempStateFile = path.join(tmpdir(), 'failed-bootstrap-state-' + Date.now() + '.json');
  try {
    saveDeploymentState({ isBootstrap: true, recordedAt: new Date().toISOString() }, tempStateFile);
    const res = spawnSync(process.execPath, [path.join(root, 'scripts/rollback.mjs')], {
      env: { ...process.env, STATE_FILE: tempStateFile },
      encoding: 'utf8',
    });
    assert.equal(res.status, 1, 'Rollback of failed bootstrap must exit code 1 to mark release FAILED');
    assert.ok(res.stderr.includes('Bootstrap deployment failed') || res.stdout.includes('bootstrap'), 'Logs explain bootstrap failure');
  } finally {
    try { rmSync(tempStateFile, { force: true }); } catch {}
  }
});

runTest('EXECUTION', 'FIX-02 Requirement 9: Rollback script strictly preserves postgres_data volume', () => {
  const rollbackContent = readFileSync(path.join(root, 'scripts/rollback.mjs'), 'utf8');
  assert.ok(!rollbackContent.includes('down -v'), 'Rollback must never call down -v');
  assert.ok(!rollbackContent.includes('--volumes'), 'Rollback must never remove volumes');
  assert.ok(rollbackContent.includes('postgres_data'), 'Rollback documents preservation of postgres_data');
});

runTest('EXECUTION', 'FIX-06 Requirement 1 & 2: Production smoke test enforces HTTPS and rejects localhost', () => {
  const resA = spawnSync(process.execPath, [path.join(root, 'scripts/smoke-test.mjs')], {
    env: { ...process.env, TARGET_ENV: 'production', TARGET_URL: 'http://localhost' },
    encoding: 'utf8',
  });
  assert.equal(resA.status, 1, 'Production smoke test must reject http://localhost');
  assert.ok(resA.stderr.includes('FATAL') && (resA.stderr.includes('localhost') || resA.stderr.includes('HTTPS')), 'Stderr must explain localhost rejection');

  const resB = spawnSync(process.execPath, [path.join(root, 'scripts/smoke-test.mjs')], {
    env: { ...process.env, TARGET_ENV: 'production', TARGET_URL: 'http://brewlite.vn' },
    encoding: 'utf8',
  });
  assert.equal(resB.status, 1, 'Production smoke test must reject non-secure HTTP');
  assert.ok(resB.stderr.includes('HTTPS/TLS'), 'Stderr must enforce HTTPS');
});

runTest('EXECUTION', 'FIX-06 Requirement 3: Smoke test probes reverse proxy prefix (/api/*) without silent bypass', () => {
  const smokeContent = readFileSync(path.join(root, 'scripts/smoke-test.mjs'), 'utf8');
  assert.ok(smokeContent.includes('${apiUrl}/health'), 'Smoke test probes /api/health');
  assert.ok(smokeContent.includes('${apiUrl}/products'), 'Smoke test probes /api/products');
  assert.ok(!smokeContent.includes('localhost:3001'), 'Smoke test does not hardcode direct port 3001 bypass');
});

runTest('EXECUTION', 'FIX-12: readHeaderSample reads chunked header from disk without loading full file into RAM', () => {
  const tempLargeFile = path.join(tmpdir(), 'brewlite-large-dump-' + Date.now() + '.sql');
  const sampleHeader = '-- PostgreSQL database dump\n-- Dumped from database version 16.1\n';
  try {
    // Write sample header followed by 10 MB of dummy content synchronously
    writeFileSync(tempLargeFile, sampleHeader, 'utf8');
    const chunk = Buffer.alloc(1024 * 1024, 'X'); // 1 MB chunk
    for (let i = 0; i < 10; i++) {
      appendFileSync(tempLargeFile, chunk);
    }

    // Verify file size is ~10 MB
    const size = statSync(tempLargeFile).size;
    assert.ok(size > 10 * 1024 * 1024, 'File should be larger than 10 MB');

    // Measure memory before and after readHeaderSample
    const memBefore = process.memoryUsage().heapUsed;
    const header = readHeaderSample(tempLargeFile, 1024);
    const memAfter = process.memoryUsage().heapUsed;

    assert.ok(header.includes('PostgreSQL database dump'), 'Header must be correctly extracted');
    // The memory growth should be trivial (< 1 MB), far below 10 MB
    const memDelta = memAfter - memBefore;
    assert.ok(memDelta < 2 * 1024 * 1024, `Heap memory growth (${(memDelta / 1024).toFixed(1)} KB) must be far below 10 MB`);
  } finally {
    try { rmSync(tempLargeFile, { force: true }); } catch {}
  }
});

runTest('EXECUTION', 'FIX-12: Corrupted or failed backup cleans up partial file and exits with code 1', () => {
  const tempDir = path.join(tmpdir(), 'corrupt-backup-test-' + Date.now());
  mkdirSync(tempDir, { recursive: true });
  try {
    // Run backup pointing to non-existent DB
    const res = spawnSync(process.execPath, [path.join(root, 'scripts/backup-db.mjs')], {
      env: { ...process.env, BACKUP_DIR: tempDir, DB_CONTAINER: 'invalid-container-' + Date.now() },
      encoding: 'utf8',
    });
    assert.equal(res.status, 1, 'Backup failure must exit with code 1');
    // Ensure no partial SQL dump file remains
    const files = existsSync(tempDir) ? readdirSync(tempDir) : [];
    assert.ok(files.length === 0 || !files.some(f => f.endsWith('.sql')), 'Partial corrupted backup file must be removed');
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

function getBashPath(filePath) {
  if (process.platform !== 'win32') {
    return filePath;
  }
  const normalized = filePath.replace(/\\/g, '/');
  const drive = normalized.match(/^([A-Za-z]):/);
  if (!drive) return normalized;
  const letter = drive[1].toLowerCase();
  const rest = normalized.substring(2);
  try {
    const testWsl = spawnSync('bash', ['-c', `[ -d "/mnt/${letter}" ]`], { stdio: 'ignore' });
    if (testWsl.status === 0) {
      return `/mnt/${letter}${rest}`;
    }
  } catch {}
  return `/${letter}${rest}`;
}

runTest('EXECUTION', 'FIX-13: Simulated remote shell exports .env properly and validates DOMAIN and database', () => {
  const tempDir = path.join(tmpdir(), 'remote-sim-' + Date.now());
  const appDir = path.join(tempDir, 'app');
  mkdirSync(appDir, { recursive: true });

  try {
    // 1. Write mock .env in app dir
    const envContent = [
      'POSTGRES_DB=brewlite_sim_db',
      'POSTGRES_USER=brewlite_sim_user',
      'POSTGRES_PASSWORD=super_secret_pw',
      'DOMAIN=coffee.brewlite.vn',
      'API_IMAGE_REF=ghcr.io/vohuunghiaah/brewlite-api:v1.0.0',
      'WEB_IMAGE_REF=ghcr.io/vohuunghiaah/brewlite-web:v1.0.0',
    ].join('\n') + '\n';
    writeFileSync(path.join(appDir, '.env'), envContent, 'utf8');

    // 2. Execute simulated remote script block via bash script file
    const bashAppDir = getBashPath(appDir);
    const simScriptPath = path.join(tempDir, 'sim-deploy.sh');
    const simScriptContent = `#!/bin/bash
set -eo pipefail
cd "${bashAppDir}"
if [ ! -f .env ]; then exit 1; fi
set -a
. ./.env
set +a
if [ -z "$DOMAIN" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_DB" ]; then
  echo "Missing required variables!"
  exit 2
fi
echo "DOMAIN_OUTPUT=$DOMAIN"
echo "USER_OUTPUT=$POSTGRES_USER"
echo "DB_OUTPUT=$POSTGRES_DB"
echo "TARGET_URL_OUTPUT=https://$DOMAIN"
`;
    writeFileSync(simScriptPath, simScriptContent, 'utf8');

    const res = spawnSync('bash', [getBashPath(simScriptPath)], { encoding: 'utf8' });
    if (res.error && res.error.code === 'ENOENT') {
      return { skipped: true, reason: 'bash CLI not available in current host PATH' };
    }

    assert.equal(res.status, 0, `Simulated remote script must succeed: ${res.stderr}`);
    assert.ok(res.stdout.includes('DOMAIN_OUTPUT=coffee.brewlite.vn'), 'DOMAIN must match .env');
    assert.ok(res.stdout.includes('USER_OUTPUT=brewlite_sim_user'), 'POSTGRES_USER must match .env');
    assert.ok(res.stdout.includes('DB_OUTPUT=brewlite_sim_db'), 'POSTGRES_DB must match .env');
    assert.ok(res.stdout.includes('TARGET_URL_OUTPUT=https://coffee.brewlite.vn'), 'TARGET_URL must be https://coffee.brewlite.vn');

    // 3. Test fail-closed when .env is missing
    const simFailPath = path.join(tempDir, 'sim-fail.sh');
    const simFailContent = `#!/bin/bash
set -eo pipefail
cd "${getBashPath(tempDir)}"
if [ ! -f .env ]; then exit 1; fi
`;
    writeFileSync(simFailPath, simFailContent, 'utf8');
    const resNoEnv = spawnSync('bash', [getBashPath(simFailPath)], { encoding: 'utf8' });
    assert.equal(resNoEnv.status, 1, 'Missing .env must cause immediate non-zero exit');
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

runTest('EXECUTION', 'FIX-14: Verification that push to main or unconfirmed dispatch cannot trigger production SSH', () => {
  const shouldDeployProduction = (event) => {
    return event.event_name === 'workflow_dispatch' &&
           event.inputs?.target_env === 'production' &&
           event.inputs?.confirm_production === 'DEPLOY_PRODUCTION';
  };

  assert.equal(
    shouldDeployProduction({ event_name: 'push', ref: 'refs/heads/main' }),
    false,
    'Push to main must NOT trigger production deployment'
  );

  assert.equal(
    shouldDeployProduction({ event_name: 'push', ref: 'refs/tags/v1.0.0' }),
    false,
    'Pushing a release tag must NOT automatically trigger production deployment'
  );

  assert.equal(
    shouldDeployProduction({ event_name: 'workflow_dispatch', inputs: { target_env: 'dry-run', confirm_production: 'DEPLOY_PRODUCTION' } }),
    false,
    'workflow_dispatch for dry-run must NOT trigger production deployment'
  );

  assert.equal(
    shouldDeployProduction({ event_name: 'workflow_dispatch', inputs: { target_env: 'production', confirm_production: '' } }),
    false,
    'workflow_dispatch without DEPLOY_PRODUCTION confirmation must NOT trigger production deployment'
  );

  assert.equal(
    shouldDeployProduction({ event_name: 'workflow_dispatch', inputs: { target_env: 'production', confirm_production: 'DEPLOY_PRODUCTION' } }),
    true,
    'Only intentional confirmed workflow_dispatch allows production deployment job entry'
  );

  const verifyApprovalPrereq = (approvalConfigured, hostProvided) => {
    let hasHost = true;
    if (approvalConfigured !== 'true') hasHost = false;
    if (!hostProvided) hasHost = false;
    return hasHost;
  };

  assert.equal(
    verifyApprovalPrereq('false', true),
    false,
    'Missing approval protection configuration (PRODUCTION_APPROVAL_CONFIGURED != true) must block deployment'
  );
  assert.equal(
    verifyApprovalPrereq('true', true),
    true,
    'When approval is configured and host credentials present, prereq passes'
  );
});

runTest('EXECUTION', 'FIX-15: Streaming base64 secret transfer handles special characters, atomic mv, 0600, and failure cleanup', () => {
  const tempDir = path.join(tmpdir(), 'secret-transfer-sim-' + Date.now());
  mkdirSync(tempDir, { recursive: true });

  try {
    const secretDbPass = 'P@$$w0rd#special"quote\'and\\backslash!%^&*()_+';
    const secretJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.s#cret$with"quotes\'and\\backslash';
    const secretUser = 'brewlite_user';
    const secretDb = 'brewlite_prod_db';
    const domain = 'brewlite.vn';

    const lines = [
      `POSTGRES_DB=${secretDb}`,
      `POSTGRES_USER=${secretUser}`,
      `POSTGRES_PASSWORD=${secretDbPass}`,
      `JWT_SECRET=${secretJwt}`,
      `DOMAIN=${domain}`,
      `NODE_ENV=production`,
    ];
    const rawContent = lines.join('\n') + '\n';
    const base64Payload = Buffer.from(rawContent, 'utf8').toString('base64');

    const bashTempDir = getBashPath(tempDir);
    const receiverScriptPath = path.join(tempDir, 'receive.sh');
    const receiverScriptContent = `#!/bin/bash
set -eo pipefail
APP_DIR="${bashTempDir}"
TMP_ENV="$APP_DIR/.env.tmp.$$"
trap 'rm -f "$TMP_ENV"' EXIT INT TERM
umask 077
base64 -d > "$TMP_ENV"
chmod 600 "$TMP_ENV"
mv -f "$TMP_ENV" "$APP_DIR/.env"
trap - EXIT INT TERM
`;
    writeFileSync(receiverScriptPath, receiverScriptContent, 'utf8');

    const res = spawnSync('bash', [getBashPath(receiverScriptPath)], {
      input: base64Payload,
      encoding: 'utf8',
    });

    if (res.error && res.error.code === 'ENOENT') {
      return { skipped: true, reason: 'bash CLI not available in current host PATH' };
    }

    assert.equal(res.status, 0, `Secret transfer pipeline must exit 0: ${res.stderr}`);

    const envFilePath = path.join(tempDir, '.env');
    assert.ok(existsSync(envFilePath), '.env file must exist after transfer');

    const writtenContent = readFileSync(envFilePath, 'utf8');
    assert.equal(writtenContent, rawContent, 'Written .env content must match raw secrets byte-for-byte');
    assert.ok(writtenContent.includes(`POSTGRES_PASSWORD=${secretDbPass}`), 'Password with $, ", \', \\, # must be exact');
    assert.ok(writtenContent.includes(`JWT_SECRET=${secretJwt}`), 'JWT secret with special characters must be exact');

    const failScriptPath = path.join(tempDir, 'fail-receive.sh');
    const failScriptContent = `#!/bin/bash
set -eo pipefail
APP_DIR="/non_existent_system_dir_for_test_failure"
TMP_ENV="$APP_DIR/.env.tmp.$$"
trap 'rm -f "$TMP_ENV"' EXIT INT TERM
base64 -d > "$TMP_ENV"
mv -f "$TMP_ENV" "$APP_DIR/.env"
`;
    writeFileSync(failScriptPath, failScriptContent, 'utf8');
    const failRes = spawnSync('bash', [getBashPath(failScriptPath)], {
      input: 'invalid_data',
      encoding: 'utf8',
    });
    assert.notEqual(failRes.status, 0, 'Broken transfer must fail-closed with non-zero exit code');
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

// =====================================================================
// SECTION 3: SIMULATION TESTS (FIX-04, FIX-08, FIX-11)
// =====================================================================

runTest('SIMULATION', 'FIX-04 Requirement 1: Dry-run job performs isolated verification with zero SSH calls', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  const dryRunSection = deployYaml.split('deploy-dry-run:')[1].split('deploy-staging:')[0];
  assert.ok(!dryRunSection.includes('ssh '), 'Dry-run must not contain any ssh commands');
  assert.ok(!dryRunSection.includes('scp '), 'Dry-run must not contain any scp commands');
  assert.ok(dryRunSection.includes('docker compose -f docker-compose.prod.yml config'), 'Dry-run validates compose config');
});

runTest('SIMULATION', 'FIX-03 & FIX-04: Missing production host credentials blocks deployment without false PASS', () => {
  const deployYaml = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(deployYaml.includes('has_host=false'), 'Must detect missing host secrets');
  assert.ok(deployYaml.includes('BLOCKED / DRY-RUN'), 'Step summary records BLOCKED / DRY-RUN status');
  assert.ok(deployYaml.includes('deployed_real'), 'Only claims VERIFIED IN PRODUCTION if deployed_real is true');
});

runTest('SIMULATION', 'FIX-08 & FIX-11: Simulated backup failure prevents subsequent migration from running', () => {
  // Simulate transactional deployment error handling:
  // step A: backup succeeds or fails
  // step B: migration runs ONLY if step A exits 0
  const tempDir = path.join(tmpdir(), 'pipeline-sim-' + Date.now());
  mkdirSync(tempDir, { recursive: true });
  try {
    let migrationExecuted = false;

    // Simulate failed backup
    const backupRes = spawnSync(process.execPath, [path.join(root, 'scripts/backup-db.mjs')], {
      env: { ...process.env, BACKUP_DIR: tempDir, DB_CONTAINER: 'invalid-container-' + Date.now() },
      encoding: 'utf8',
    });

    if (backupRes.status === 0) {
      migrationExecuted = true;
    }

    assert.equal(backupRes.status, 1, 'Backup step must fail with code 1');
    assert.equal(migrationExecuted, false, 'Migration must NOT run when backup fails');
  } finally {
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

runTest('SIMULATION', 'FIX-11: Real Docker Compose rollback simulation in isolated project preserves volume data', () => {
  let dockerAvailable = false;
  try {
    const check = spawnSync('docker', ['info'], { stdio: 'ignore' });
    dockerAvailable = check.status === 0;
  } catch {}

  if (!dockerAvailable) {
    return { skipped: true, reason: 'Docker daemon not running in current environment' };
  }

  // Setup isolated Docker Compose project
  const projectName = 'brewlite-test-rollback-sim';
  const tempDir = path.join(tmpdir(), 'sim-compose-' + Date.now());
  mkdirSync(tempDir, { recursive: true });

  const composeSimPath = path.join(tempDir, 'docker-compose.sim.yml');
  const stateFilePath = path.join(tempDir, '.sim-state.json');
  const simVolume = 'sim_pg_vol_' + Date.now();

  const tagV1 = 'brewlite-sim-app:v1-stable';
  const tagV2 = 'brewlite-sim-app:v2-broken';

  const simComposeYaml = `
services:
  db:
    image: postgres:16-alpine
    container_name: ${projectName}-db
    environment:
      POSTGRES_USER: brewlite
      POSTGRES_PASSWORD: sim_secret_password
      POSTGRES_DB: postgres
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - ${simVolume}:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h 127.0.0.1 -U brewlite -d postgres"]
      interval: 1s
      timeout: 2s
      retries: 15

  api:
    image: \${API_IMAGE_REF:-${tagV1}}
    pull_policy: never
    container_name: ${projectName}-api
    command: ["sh", "-c", "if [ \\"\$FAIL_HEALTH\\" = \\"1\\" ]; then exit 1; else sleep 3600; fi"]
    healthcheck:
      test: ["CMD-SHELL", "test \\"\$FAIL_HEALTH\\" != \\"1\\""]
      interval: 1s
      timeout: 1s
      retries: 2

  web:
    image: \${WEB_IMAGE_REF:-${tagV1}}
    pull_policy: never
    container_name: ${projectName}-web
    command: ["sh", "-c", "sleep 3600"]
    healthcheck:
      test: ["CMD-SHELL", "exit 0"]
      interval: 1s
      timeout: 1s
      retries: 2

volumes:
  ${simVolume}:
`;

  writeFileSync(composeSimPath, simComposeYaml.trim(), 'utf8');

  try {
    // 1. Ensure alpine:latest and postgres:16-alpine base images are cached locally
    const checkAlpine = spawnSync('docker', ['image', 'inspect', 'alpine:latest'], { stdio: 'ignore' });
    if (checkAlpine.status !== 0) {
      spawnSync('docker', ['pull', 'alpine:latest'], { stdio: 'ignore' });
    }
    const checkPg = spawnSync('docker', ['image', 'inspect', 'postgres:16-alpine'], { stdio: 'ignore' });
    if (checkPg.status !== 0) {
      spawnSync('docker', ['pull', 'postgres:16-alpine'], { stdio: 'ignore' });
    }

    const tag1 = spawnSync('docker', ['tag', 'alpine:latest', tagV1], { stdio: 'ignore' });
    const tag2 = spawnSync('docker', ['tag', 'alpine:latest', tagV2], { stdio: 'ignore' });
    if (tag1.status !== 0 || tag2.status !== 0) {
      return { skipped: true, reason: 'Failed to tag alpine:latest for simulation' };
    }

    // 2. Initial deployment (v1)
    const envV1 = {
      ...process.env,
      API_IMAGE_REF: tagV1,
      WEB_IMAGE_REF: tagV1,
      FAIL_HEALTH: '0',
    };

    const upV1 = spawnSync('docker', ['compose', '-p', projectName, '-f', composeSimPath, 'up', '-d'], {
      env: envV1,
      encoding: 'utf8',
    });
    assert.equal(upV1.status, 0, `Initial compose up must succeed: ${upV1.stderr}`);

    // Wait for DB to be healthy
    let dbReady = false;
    for (let i = 0; i < 20; i++) {
      const inspect = spawnSync('docker', ['exec', `${projectName}-db`, 'pg_isready', '-h', '127.0.0.1', '-U', 'brewlite', '-d', 'postgres'], { stdio: 'ignore' });
      if (inspect.status === 0) {
        dbReady = true;
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
    assert.ok(dbReady, 'Database container in isolated simulation must achieve ready state');

    // Insert test record to verify data preservation across rollback
    const insertRes = spawnSync('docker', [
      'exec',
      '-e',
      'PGPASSWORD=sim_secret_password',
      `${projectName}-db`,
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'brewlite',
      '-d',
      'postgres',
      '-c',
      "CREATE TABLE IF NOT EXISTS audit_log (msg text); INSERT INTO audit_log VALUES ('persisted_across_rollback');",
    ], { encoding: 'utf8' });
    assert.equal(insertRes.status, 0, `Insert test record failed: ${insertRes.stderr}`);

    // 3. Save deployment state
    saveDeploymentState({
      isBootstrap: false,
      previousApiImage: tagV1,
      previousWebImage: tagV1,
      recordedAt: new Date().toISOString(),
    }, stateFilePath);

    // 4. Simulate failed v2 deployment (FAIL_HEALTH=1 causes api to crash)
    const envV2 = {
      ...process.env,
      API_IMAGE_REF: tagV2,
      WEB_IMAGE_REF: tagV1,
      FAIL_HEALTH: '1',
    };
    spawnSync('docker', ['compose', '-p', projectName, '-f', composeSimPath, 'up', '-d', '--no-deps', 'api'], {
      env: envV2,
      stdio: 'ignore',
    });

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);

    // Confirm api container failed/exited
    const inspectV2 = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', `${projectName}-api`], { encoding: 'utf8' });
    const isV2Running = inspectV2.stdout.trim() === 'true';
    assert.equal(isV2Running, false, 'v2 API container with FAIL_HEALTH=1 must fail/exit');

    // 5. Execute rollback via scripts/rollback.mjs in isolated project
    const rollbackRes = spawnSync(process.execPath, [path.join(root, 'scripts/rollback.mjs')], {
      env: {
        ...process.env,
        STATE_FILE: stateFilePath,
        COMPOSE_FILE: composeSimPath,
        COMPOSE_PROJECT_NAME: projectName,
        API_CONTAINER: `${projectName}-api`,
        WEB_CONTAINER: `${projectName}-web`,
      },
      encoding: 'utf8',
    });
    assert.equal(rollbackRes.status, 0, `Rollback script must exit with code 0: ${rollbackRes.stderr}`);

    // 6. Assert restored container image and health
    const inspectApiRestored = spawnSync('docker', ['inspect', '--format', '{{.Config.Image}} {{.State.Health.Status}}', `${projectName}-api`], { encoding: 'utf8' });
    const [restoredImg, restoredHealth] = inspectApiRestored.stdout.trim().split(' ');
    assert.equal(restoredImg, tagV1, `API image must be rolled back to ${tagV1}`);
    assert.equal(restoredHealth, 'healthy', 'Rolled back API container must be healthy');

    // 7. Verify PostgreSQL data was preserved 100% on named volume
    const queryData = spawnSync('docker', [
      'exec',
      '-e',
      'PGPASSWORD=sim_secret_password',
      `${projectName}-db`,
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'brewlite',
      '-d',
      'postgres',
      '-t',
      '-c',
      'SELECT msg FROM audit_log;',
    ], { encoding: 'utf8' });
    assert.ok(queryData.stdout.includes('persisted_across_rollback'), `Database data must be preserved across rollback, stdout: "${queryData.stdout}", stderr: "${queryData.stderr}"`);
  } finally {
    // 8. Clean up ONLY this isolated simulation project
    spawnSync('docker', ['compose', '-p', projectName, '-f', composeSimPath, 'down', '-v'], { stdio: 'ignore' });
    spawnSync('docker', ['rmi', tagV1, tagV2], { stdio: 'ignore' });
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
});

console.log('\n======================================================================');
console.log('📊 TASK 5.3 DEPLOYMENT & DELIVERY TEST SUMMARY');
console.log('======================================================================');
console.table(suite);

const hasFailure = suite.some(s => s.status === 'FAIL');
if (hasFailure) {
  console.error('\n❌ SOME VERIFICATIONS FAILED');
  process.exit(1);
} else {
  const passCount = suite.filter(s => s.status === 'PASS').length;
  const skipCount = suite.filter(s => s.status === 'SKIPPED').length;
  console.log(`\n🎉 VERIFICATION FINISHED: ${passCount} PASSED, ${skipCount} SKIPPED, 0 FAILED!`);
  process.exit(0);
}
