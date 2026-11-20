#!/usr/bin/env node
/**
 * BrewLite Database Pre-Deployment Backup Script (Task 5.3 - FIX-01)
 * Creates a timestamped logical backup of the PostgreSQL database before
 * executing migrations or rolling releases.
 * 
 * FAIL-CLOSED GUARANTEE:
 * - If the database exists and has data, pg_dump MUST succeed. If pg_dump fails,
 *   the script exits with code 1, immediately halting migrations.
 * - Distinguishes between fresh/cold-start databases (0 tables or --fresh)
 *   and upgrade of databases with existing tables.
 * - Streams output directly to file (no maxBuffer limitation).
 * - Masks all sensitive credentials in output logs.
 * - Enforces file permissions 0600 on generated backup files.
 */

import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, statSync, readFileSync, rmSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backupDir = process.env.BACKUP_DIR || path.join(root, 'backups');
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `db-backup-${timestamp}.sql`);

const container = process.env.DB_CONTAINER || 'brewlite-prod-db';
const user = process.env.POSTGRES_USER || 'brewlite';
const dbName = process.env.POSTGRES_DB || 'brewlite';
const isExplicitFresh = process.argv.includes('--fresh') || process.env.IS_FRESH_DEPLOY === 'true';

function maskSecret(text) {
  if (!text) return '';
  return String(text).replace(/(password|secret|key|token)=([^\s&]+)/gi, '$1=***');
}

console.log('======================================================================');
console.log('📦 BREWLITE DATABASE PRE-DEPLOYMENT BACKUP (FAIL-CLOSED)');
console.log(`🗄️ Database:  ${dbName}`);
console.log(`📁 Container: ${container}`);
console.log(`💾 Target:    ${backupFile}`);
console.log(`⚙️ Mode:      ${isExplicitFresh ? 'Explicit Fresh Setup (--fresh)' : 'Standard Verification'}`);
console.log('======================================================================\n');

async function runBackup() {
  // Step 1: Check if container is running
  let psOutput = '';
  try {
    psOutput = execFileSync('docker', ['ps', '--filter', `name=${container}`, '--format', '{{.Names}}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    console.error('❌ Failed to check docker container status:', maskSecret(err.message));
    process.exit(1);
  }

  const isRunning = psOutput.split('\n').some(name => name.trim() === container);

  if (!isRunning) {
    if (isExplicitFresh) {
      console.log(`ℹ️ Container "${container}" is not running in cold-start mode (--fresh).`);
      console.log('Creating initial cold-start baseline checkpoint file.');
      const fs = await import('node:fs/promises');
      await fs.writeFile(backupFile, `-- Cold-start initial database setup\n-- Timestamp: ${new Date().toISOString()}\n`, { mode: 0o600 });
      console.log(`✔ Cold-start baseline created: ${backupFile}`);
      process.exit(0);
    } else {
      console.error(`❌ FAIL-CLOSED: Database container "${container}" is not running.`);
      console.error('Aborting deployment. Cannot safely perform migration without verifying database status.');
      process.exit(1);
    }
  }

  // Step 2: Container is running — Query table count to distinguish fresh vs existing DB
  console.log(`Checking existing schema in database "${dbName}"...`);
  let tableCount = 0;
  try {
    const countOutput = execFileSync('docker', [
      'exec',
      container,
      'psql',
      '-U',
      user,
      '-d',
      dbName,
      '-t',
      '-c',
      "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';",
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    tableCount = parseInt(countOutput, 10);
    if (Number.isNaN(tableCount)) {
      throw new Error(`Unexpected table count output: "${countOutput}"`);
    }
    console.log(`Database "${dbName}" has ${tableCount} existing public table(s).`);
  } catch (err) {
    console.error(`❌ FAIL-CLOSED: Failed to query database table status in container "${container}":`, maskSecret(err.message));
    console.error('Aborting deployment. Database connection or authentication failure.');
    process.exit(1);
  }

  // Step 3: Handle fresh/empty database
  if (tableCount === 0) {
    console.log('ℹ️ Database is empty (0 public tables). Writing initial baseline checkpoint.');
    const fs = await import('node:fs/promises');
    await fs.writeFile(backupFile, `-- Fresh database baseline\n-- Database: ${dbName}\n-- Timestamp: ${new Date().toISOString()}\n-- 0 tables present\n`, { mode: 0o600 });
    console.log(`✔ Fresh database baseline recorded: ${backupFile}`);
    process.exit(0);
  }

  // Step 4: Existing database with tables — pg_dump is MANDATORY and MUST stream without buffer limits
  console.log(`Existing database with ${tableCount} tables detected. Initiating streaming pg_dump...`);

  await new Promise((resolve, reject) => {
    const fileStream = createWriteStream(backupFile, { mode: 0o600 });
    let stderrChunks = [];

    const dumpProc = spawn('docker', [
      'exec',
      container,
      'pg_dump',
      '-U',
      user,
      '-d',
      dbName,
      '--no-owner',
      '--no-privileges',
    ]);

    dumpProc.stdout.pipe(fileStream);

    dumpProc.stderr.on('data', (chunk) => {
      stderrChunks.push(chunk);
    });

    dumpProc.on('error', (err) => {
      reject(err);
    });

    dumpProc.on('close', (code) => {
      fileStream.close(() => {
        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString('utf8');
          reject(new Error(`pg_dump exited with error code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }).catch((err) => {
    // Clean up partial/corrupted backup file
    if (existsSync(backupFile)) {
      try { rmSync(backupFile, { force: true }); } catch {}
    }
    console.error('❌ FAIL-CLOSED: pg_dump failed:', maskSecret(err.message));
    console.error('Migration is BLOCKED because pre-deployment backup could not be completed.');
    process.exit(1);
  });

  // Step 5: Validate backup integrity and permissions
  try {
    const stats = statSync(backupFile);
    if (stats.size === 0) {
      rmSync(backupFile, { force: true });
      throw new Error('Generated backup file is 0 bytes (empty).');
    }

    const header = readFileSync(backupFile, { encoding: 'utf8', flag: 'r' }).slice(0, 1024);
    if (!header.includes('PostgreSQL database dump') && !header.includes('PostgreSQL')) {
      rmSync(backupFile, { force: true });
      throw new Error('Backup file does not contain a valid PostgreSQL database dump header.');
    }

    // Enforce 0600 file permissions
    try { chmodSync(backupFile, 0o600); } catch {}

    console.log(`✔ Pre-deployment backup verified: ${backupFile} (${(stats.size / 1024).toFixed(2)} KB, 0600 permissions)`);
    console.log('✔ Safe to proceed with database migrations.');
    process.exit(0);
  } catch (err) {
    console.error('❌ FAIL-CLOSED: Backup integrity verification failed:', maskSecret(err.message));
    process.exit(1);
  }
}

runBackup().catch((err) => {
  console.error('❌ Unhandled backup error:', maskSecret(err.message));
  process.exit(1);
});
