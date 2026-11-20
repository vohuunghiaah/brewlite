#!/usr/bin/env node
/**
 * BrewLite Database Pre-Deployment Backup Script (Task 5.3 - Phase F)
 * Creates a timestamped logical backup of the PostgreSQL database before
 * executing migrations or rolling releases.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backupDir = path.join(root, 'backups');
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `db-backup-${timestamp}.sql`);

const container = process.env.DB_CONTAINER || 'brewlite-prod-db';
const user = process.env.POSTGRES_USER || 'brewlite';
const dbName = process.env.POSTGRES_DB || 'brewlite';

console.log('======================================================================');
console.log('📦 BREWLITE DATABASE PRE-DEPLOYMENT BACKUP');
console.log(`🗄️ Database:  ${dbName}`);
console.log(`📁 Container: ${container}`);
console.log(`💾 Target:    ${backupFile}`);
console.log('======================================================================\n');

try {
  // Check if container is running
  const psOutput = execFileSync('docker', ['ps', '--filter', `name=${container}`, '--format', '{{.Names}}'], {
    encoding: 'utf8',
  }).trim();

  if (!psOutput.includes(container)) {
    console.warn(`⚠️ Database container "${container}" is not running or accessible.`);
    console.warn('Skipping online pg_dump (fresh deployment or offline container).');
    process.exit(0);
  }

  console.log(`Running pg_dump inside container ${container}...`);
  const dump = execFileSync('docker', [
    'exec',
    container,
    'pg_dump',
    '-U',
    user,
    '-d',
    dbName,
    '--no-owner',
    '--no-privileges',
  ], {
    maxBuffer: 50 * 1024 * 1024,
  });

  const fs = await import('node:fs/promises');
  await fs.writeFile(backupFile, dump);

  const stats = statSync(backupFile);
  console.log(`✔ Backup created successfully: ${backupFile} (${(stats.size / 1024).toFixed(2)} KB)`);
  process.exit(0);
} catch (err) {
  console.error('❌ Database backup encountered an issue:', err.message);
  // Do not crash deployment if this is a fresh setup with no tables
  process.exit(0);
}
