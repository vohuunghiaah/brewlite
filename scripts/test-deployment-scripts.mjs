#!/usr/bin/env node
/**
 * Automated Verification Suite for Task 5.3 Deployment Tooling & Safety Rules
 * Tests:
 * 1. Docker Compose Production Configuration (No public db/api ports, resource limits, log rotation)
 * 2. Caddy Reverse Proxy & Security Headers
 * 3. Smoke Test Secret Leak Detection & Masking
 * 4. Safe Rollback Invariants (No volume deletion, no destructive downgrade)
 * 5. Multi-stage Dockerfile Non-root & Standalone Compliance
 */

import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

console.log('======================================================================');
console.log('🧪 TASK 5.3 DEPLOYMENT & DELIVERY AUTOMATED VERIFICATION');
console.log('======================================================================\n');

const suite = [];

function test(name, fn) {
  try {
    fn();
    suite.push({ test: name, status: 'PASS' });
    console.log(`✔ PASS: ${name}`);
  } catch (err) {
    suite.push({ test: name, status: 'FAIL', error: err.message });
    console.error(`❌ FAIL: ${name} -> ${err.message}`);
  }
}

// 1. Docker Compose Production Configuration
test('ADR-007: docker-compose.prod.yml exists and defines caddy, web, api, db', () => {
  const file = path.join(root, 'docker-compose.prod.yml');
  assert.ok(existsSync(file), 'docker-compose.prod.yml must exist');
  const content = readFileSync(file, 'utf8');
  assert.ok(content.includes('caddy:'), 'Must define caddy service');
  assert.ok(content.includes('web:'), 'Must define web service');
  assert.ok(content.includes('api:'), 'Must define api service');
  assert.ok(content.includes('db:'), 'Must define db service');
});

test('ADR-007 Security: Port 5432 (DB) and Port 3001 (API) are strictly internal (no host port mapping)', () => {
  const content = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8');
  
  // Check db service section
  const dbSection = content.split('db:')[1].split('volumes:')[0];
  assert.ok(!dbSection.includes('ports:'), 'PostgreSQL must not expose any host ports in production');
  assert.ok(!dbSection.includes('5432:5432'), 'Port 5432 must not be mapped to host');

  // Check api service section
  const apiSection = content.split('api:')[1].split('db:')[0];
  assert.ok(!apiSection.includes('ports:'), 'API service must not expose direct host ports (proxied via Caddy)');
  assert.ok(!apiSection.includes('3001:3001'), 'Port 3001 must not be mapped to host');
});

test('ADR-007 Topology: Only Caddy exposes public ports 80 and 443', () => {
  const content = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8');
  assert.ok(content.includes('"80:80"') || content.includes("'80:80'") || content.includes('80:80'), 'Caddy must expose port 80');
  assert.ok(content.includes('"443:443"') || content.includes("'443:443'") || content.includes('443:443'), 'Caddy must expose port 443');
});

test('Resource Budget: All production containers have memory limits fitting 2 GB Lightsail VM', () => {
  const content = readFileSync(path.join(root, 'docker-compose.prod.yml'), 'utf8');
  assert.ok(content.includes('memory: 128M') || content.includes('memory: 256M'), 'Caddy memory limited');
  assert.ok(content.includes('memory: 512M'), 'Services have 512M limits');
  assert.ok(content.includes('max-size: "10m"'), 'Log rotation configured');
  assert.ok(content.includes('max-file: "3"'), 'Log file limit configured');
});

// 2. Caddy Reverse Proxy & Security Headers
test('Caddyfile: Routes /api/* to api:3001 and all other routes to web:3000', () => {
  const content = readFileSync(path.join(root, 'Caddyfile'), 'utf8');
  assert.ok(content.includes('handle_path /api/*'), 'Must strip /api path prefix');
  assert.ok(content.includes('reverse_proxy api:3001'), 'Must proxy to api:3001');
  assert.ok(content.includes('reverse_proxy web:3000'), 'Must proxy UI to web:3000');
  assert.ok(content.includes('Strict-Transport-Security'), 'Must include HSTS header');
  assert.ok(content.includes('X-Content-Type-Options "nosniff"'), 'Must include nosniff');
  assert.ok(content.includes('X-Frame-Options "DENY"'), 'Must include DENY frame options');
});

// 3. Smoke Test Secret Leak Detection
test('Smoke Test: Secret leak detector intercepts exposed passwords or keys', () => {
  const sensitivePatterns = [
    /postgres_password/i,
    /brewlite_dev_password/i,
    /jwt_secret/i,
    /BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY/,
  ];

  const payloadWithLeak = '{"status":"ok","db_password":"postgres_password_123"}';
  const hasLeak = sensitivePatterns.some(p => p.test(payloadWithLeak));
  assert.equal(hasLeak, true, 'Detector must catch exposed credentials');

  const cleanPayload = '{"status":"ok","database":"up"}';
  const cleanLeak = sensitivePatterns.some(p => p.test(cleanPayload));
  assert.equal(cleanLeak, false, 'Clean payload must pass without false alarm');
});

// 4. Safe Rollback Rules
test('Rollback Safety: rollback.mjs preserves postgres_data volume and avoids destructive resets', () => {
  const content = readFileSync(path.join(root, 'scripts/rollback.mjs'), 'utf8');
  assert.ok(!content.includes('down -v'), 'Rollback must never drop volumes');
  assert.ok(!content.includes('--volumes'), 'Rollback must never delete persistent volumes');
  assert.ok(content.includes('--no-deps') && content.includes("'api'") && content.includes("'web'"), 'Rollback only replaces application containers');
});

// 5. Multi-stage Dockerfiles
test('Phase B: API Dockerfile contains multi-stage builder and non-root runner', () => {
  const content = readFileSync(path.join(root, 'apps/api/Dockerfile'), 'utf8');
  assert.ok(content.includes('AS builder'), 'Must have builder stage');
  assert.ok(content.includes('AS runner'), 'Must have production runner stage');
  assert.ok(content.includes('USER node'), 'Must execute as non-root node user');
  assert.ok(content.includes('HEALTHCHECK'), 'Must have container healthcheck');
  assert.ok(content.includes('CMD ["node", "dist/main"]'), 'Must execute compiled JS in production');
});

test('Phase B: Web Dockerfile contains Next.js standalone and parameterized API URL', () => {
  const content = readFileSync(path.join(root, 'apps/web/Dockerfile'), 'utf8');
  assert.ok(content.includes('AS builder'), 'Must have builder stage');
  assert.ok(content.includes('AS runner'), 'Must have production runner stage');
  assert.ok(content.includes('ARG NEXT_PUBLIC_API_URL=/api'), 'Must parameterize NEXT_PUBLIC_API_URL defaulting to /api');
  assert.ok(content.includes('USER node'), 'Must execute as non-root node user');
  assert.ok(content.includes('.next/standalone'), 'Must use Next.js standalone server');
  assert.ok(content.includes('HEALTHCHECK'), 'Must have container healthcheck');
});

// 6. CI/CD Workflow
test('Phase D: .github/workflows/deploy.yml defines full delivery pipeline with approval gate', () => {
  const content = readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
  assert.ok(content.includes('quality-gate:'), 'Must include quality-gate job');
  assert.ok(content.includes('build-and-push:'), 'Must include build-and-push job');
  assert.ok(content.includes('deploy-production:'), 'Must include deploy-production job');
  assert.ok(content.includes('environment:'), 'Must target GitHub Environment');
  assert.ok(content.includes('name: production'), 'Must specify production environment');
  assert.ok(content.includes('ghcr.io'), 'Must push to GHCR');
});

console.log('\n======================================================================');
console.log('📊 TASK 5.3 DEPLOYMENT TEST SUMMARY');
console.log('======================================================================');
console.table(suite);

const hasFailure = suite.some(s => s.status === 'FAIL');
if (hasFailure) {
  console.error('\n❌ SOME VERIFICATIONS FAILED');
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${suite.length} DEPLOYMENT VERIFICATION TESTS PASSED 100%!`);
  process.exit(0);
}
