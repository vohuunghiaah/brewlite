#!/usr/bin/env node
/**
 * BrewLite Production Rollback Script (Task 5.3 - Phase G)
 * Safely rolls back application containers to previous known-good image tags/digests
 * while strictly preserving PostgreSQL data volumes and state.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const stateFile = path.join(root, '.deployment-state.json');

console.log('======================================================================');
console.log('🔄 BREWLITE PRODUCTION ROLLBACK PROCEDURE');
console.log('======================================================================\n');

// Read rollback target state
let previousState = null;
if (existsSync(stateFile)) {
  try {
    previousState = JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch (e) {
    console.warn('⚠️ Could not parse .deployment-state.json:', e.message);
  }
}

const previousApiImage = process.env.ROLLBACK_API_IMAGE || previousState?.previousApiImage;
const previousWebImage = process.env.ROLLBACK_WEB_IMAGE || previousState?.previousWebImage;

if (!previousApiImage || !previousWebImage) {
  console.warn('⚠️ No explicit rollback target images recorded in state or environment.');
  console.log('Falling back to rolling back application containers to latest stable release tag.');
}

console.log(`Target Rollback Images:`);
console.log(`- API: ${previousApiImage || 'previous stable release'}`);
console.log(`- Web: ${previousWebImage || 'previous stable release'}\n`);

// SAFETY RULE ENFORCEMENT: Never drop postgres volume during rollback
console.log('🛡️ ENFORCING SAFETY RULES:');
console.log('- PostgreSQL persistent volumes (postgres_data) are preserved.');
console.log('- Zero DROP TABLE / DOWN migrations executed.');
console.log('- Reverting application containers only.\n');

try {
  const env = {
    ...process.env,
    API_IMAGE: previousApiImage ? previousApiImage.split(':')[0] : process.env.API_IMAGE,
    IMAGE_TAG: previousApiImage && previousApiImage.includes(':') ? previousApiImage.split(':')[1] : 'stable',
    WEB_IMAGE: previousWebImage ? previousWebImage.split(':')[0] : process.env.WEB_IMAGE,
  };

  console.log('Re-deploying application containers with previous known-good images...');
  execFileSync('docker', ['compose', '-f', 'docker-compose.prod.yml', 'up', '-d', '--no-deps', 'api', 'web'], {
    cwd: root,
    env,
    stdio: 'inherit',
  });

  console.log('\nVerifying container health after rollback...');
  execFileSync('docker', ['compose', '-f', 'docker-compose.prod.yml', 'ps'], {
    cwd: root,
    stdio: 'inherit',
  });

  console.log('\n✔ Rollback execution finished successfully.');
} catch (err) {
  console.error('\n❌ Rollback failed:', err.message);
  process.exit(1);
}
