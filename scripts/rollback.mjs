#!/usr/bin/env node
/**
 * BrewLite Production Rollback Script (Task 5.3 - FIX-02)
 * Safely rolls back application containers (API and Web) to their exact previous
 * known-good image references or digests while strictly preserving PostgreSQL data volumes.
 * 
 * SAFETY INVARIANTS:
 * 1. Requires explicit previous image references for BOTH API and Web.
 * 2. NEVER assumes 'stable' tag exists; NEVER uses 'latest' as rollback target.
 * 3. Supports independent image references/digests for API and Web.
 * 4. Fails safely (exit code 1) when no valid rollback target is available.
 * 5. Re-probes container healthcheck after rollback to confirm recovery.
 * 6. Strictly preserves persistent database volumes (postgres_data).
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDeploymentState, DEFAULT_STATE_FILE } from './deployment-state.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const stateFile = process.env.STATE_FILE || DEFAULT_STATE_FILE;

console.log('======================================================================');
console.log('🔄 BREWLITE PRODUCTION ROLLBACK PROCEDURE (STRICT SAFETY)');
console.log('======================================================================\n');

// Step 1: Read previous deployment state
const state = loadDeploymentState(stateFile);

const previousApiImage = (process.env.ROLLBACK_API_IMAGE || state?.previousApiImage || '').trim();
const previousWebImage = (process.env.ROLLBACK_WEB_IMAGE || state?.previousWebImage || '').trim();

// Step 2: Validate that both images are present and neither is 'latest' or 'stable'
const forbiddenTags = ['latest', 'stable', ''];

function isInvalidTarget(img) {
  if (!img) return true;
  const tag = img.includes(':') ? img.split(':').pop() : '';
  return forbiddenTags.includes(tag.toLowerCase()) && !img.includes('@sha256:');
}

if (!previousApiImage || !previousWebImage || isInvalidTarget(previousApiImage) || isInvalidTarget(previousWebImage)) {
  console.error('❌ FATAL: Cannot perform safe rollback without explicit, distinct previous image references for BOTH API and Web.');
  console.error(`- Provided API Image: "${previousApiImage || 'MISSING'}"`);
  console.error(`- Provided Web Image: "${previousWebImage || 'MISSING'}"`);
  console.error('Rollback targets must specify an exact commit SHA tag or immutable digest (cannot be "latest", "stable", or empty).');
  console.error('Aborting rollback. System remains in current state for manual inspection.');
  process.exit(1);
}

console.log('Target Rollback Images Identified:');
console.log(`- API Target: \x1b[36m${previousApiImage}\x1b[0m`);
console.log(`- Web Target: \x1b[36m${previousWebImage}\x1b[0m\n`);

// SAFETY RULE ENFORCEMENT: Never drop postgres volume during rollback
console.log('🛡️ ENFORCING PRODUCTION SAFETY RULES:');
console.log('- PostgreSQL persistent volumes (postgres_data) are preserved.');
console.log('- Zero DROP TABLE / destructive down migrations executed.');
console.log('- Reverting application containers (API + Web) only.\n');

try {
  const env = {
    ...process.env,
    API_IMAGE_REF: previousApiImage,
    WEB_IMAGE_REF: previousWebImage,
  };

  console.log('Rolling back application containers with exact image references...');
  execFileSync('docker', [
    'compose',
    '-f',
    'docker-compose.prod.yml',
    'up',
    '-d',
    '--no-deps',
    'api',
    'web',
  ], {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  console.log('\nWaiting for rolled-back containers to report healthy...');
  // Probe container health status up to 30 seconds
  const apiContainer = process.env.API_CONTAINER || 'brewlite-prod-api';
  const webContainer = process.env.WEB_CONTAINER || 'brewlite-prod-web';
  
  let isApiHealthy = false;
  let isWebHealthy = false;

  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      const apiStatus = execFileSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', apiContainer], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (apiStatus === 'healthy') isApiHealthy = true;
    } catch {}

    try {
      const webStatus = execFileSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', webContainer], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (webStatus === 'healthy') isWebHealthy = true;
    } catch {}

    if (isApiHealthy && isWebHealthy) break;
    // sleep 2s
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000);
  }

  execFileSync('docker', ['compose', '-f', 'docker-compose.prod.yml', 'ps'], {
    cwd: root,
    stdio: 'inherit',
  });

  if (!isApiHealthy || !isWebHealthy) {
    console.error(`\n❌ Rollback warning: Containers did not achieve "healthy" status within timeout (API healthy: ${isApiHealthy}, Web healthy: ${isWebHealthy}).`);
    process.exit(1);
  }

  console.log('\n✔ Rollback execution finished successfully: Both API and Web are healthy.');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Rollback failed:', err.message);
  process.exit(1);
}
