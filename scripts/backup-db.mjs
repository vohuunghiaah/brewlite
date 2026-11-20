#!/usr/bin/env node
/**
 * BrewLite Database Pre-Deployment Backup Script (Task 5.3 - FIX-01, FIX-08, FIX-12)
 * Creates a timestamped logical backup of the PostgreSQL database before
 * executing migrations or rolling releases.
 * 
 * FAIL-CLOSED GUARANTEE & INTEGRITY:
 * - Database container MUST be running and responsive.
 * - Distinguishes between proven fresh databases (0 public tables) and existing databases.
 * - Rejects any attempt to use --fresh to bypass existing tables.
 * - Streams output directly from pg_dump stdout to writeStream without maxBuffer.
 * - Reads only a fixed sample header (1024 bytes) without loading large dump into RAM.
 * - Handles file stream write errors, pg_dump process errors, and cleans up partial files.
 * - Exits with code 1 immediately on any backup failure, halting migrations.
 * - Enforces file permissions 0600 on generated backup files.
 * - Masks all sensitive credentials in output logs.
 */

import { spawn, execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, statSync, rmSync, chmodSync, openSync, readSync, closeSync } from 'node:fs';
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

/**
 * Reads only the first sampleSize bytes of a file to avoid loading huge dumps into RAM (FIX-12).
 */
export function readHeaderSample(filePath, sampleSize = 1024) {
  const fd = openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(sampleSize);
    const bytesRead = readSync(fd, buffer, 0, sampleSize, 0);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

async function runBackup() {
  console.log('======================================================================');
  console.log('📦 BREWLITE DATABASE PRE-DEPLOYMENT BACKUP (FAIL-CLOSED)');
  console.log(`🗄️ Database:  ${dbName}`);
  console.log(`📁 Container: ${container}`);
  console.log(`💾 Target:    ${backupFile}`);
  console.log(`⚙️ Mode:      ${isExplicitFresh ? 'Fresh Setup Requested (--fresh)' : 'Standard Verification'}`);
  console.log('======================================================================\n');

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
    // FIX-08: Container MUST be running even if --fresh was requested.
    console.error(`❌ FAIL-CLOSED: Database container "${container}" is not running.`);
    console.error('Database container must be started and ready before migrations can proceed.');
    process.exit(1);
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

  // Step 3: Handle fresh/empty database (FIX-08)
  if (tableCount === 0) {
    console.log('ℹ️ Proven empty database: 0 public tables detected.');
    const checkpointFile = path.join(backupDir, `bootstrap-checkpoint-${timestamp}.json`);
    const checkpoint = {
      isBootstrap: true,
      database: dbName,
      tableCount: 0,
      timestamp: new Date().toISOString(),
      note: 'Initial empty database baseline checkpoint before first migration'
    };
    const fs = await import('node:fs/promises');
    await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2) + '\n', { mode: 0o600 });
    console.log(`✔ Initial bootstrap checkpoint recorded: ${checkpointFile}`);
    console.log('✔ Safe to proceed with initial database migration.');
    process.exit(0);
  }

  // FIX-08 & FIX-12: If tableCount > 0, database has existing data!
  if (isExplicitFresh) {
    console.warn(`⚠️ Warning: --fresh was specified, but database "${dbName}" has ${tableCount} existing table(s).`);
    console.warn('Ignoring --fresh flag. Performing mandatory pre-deployment backup.');
  }

  console.log(`Existing database with ${tableCount} tables detected. Initiating streaming pg_dump...`);

  // Step 4: Stream pg_dump directly to file handling write errors and process errors (FIX-12)
  await new Promise((resolve, reject) => {
    const fileStream = createWriteStream(backupFile, { mode: 0o600 });
    let stderrChunks = [];
    let streamFailed = false;

    fileStream.on('error', (err) => {
      streamFailed = true;
      reject(new Error(`File stream write error: ${err.message}`));
    });

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
      streamFailed = true;
      reject(new Error(`Failed to spawn pg_dump process: ${err.message}`));
    });

    dumpProc.on('close', (code) => {
      fileStream.close(() => {
        if (streamFailed) return;
        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString('utf8');
          reject(new Error(`pg_dump exited with error code ${code}: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }).catch((err) => {
    // FIX-12: Delete incomplete or corrupted backup file
    if (existsSync(backupFile)) {
      try { rmSync(backupFile, { force: true }); } catch {}
    }
    console.error('❌ FAIL-CLOSED: pg_dump failed:', maskSecret(err.message));
    console.error('Migration is BLOCKED because pre-deployment backup could not be completed.');
    process.exit(1);
  });

  // Step 5: Validate backup integrity using chunked header reader (FIX-12)
  try {
    const stats = statSync(backupFile);
    if (stats.size === 0) {
      rmSync(backupFile, { force: true });
      throw new Error('Generated backup file is 0 bytes (empty).');
    }

    // FIX-12: Read sample header without loading full file into memory
    const header = readHeaderSample(backupFile, 1024);
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
    if (existsSync(backupFile)) {
      try { rmSync(backupFile, { force: true }); } catch {}
    }
    console.error('❌ FAIL-CLOSED: Backup integrity verification failed:', maskSecret(err.message));
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('backup-db.mjs')) {
  runBackup().catch((err) => {
    console.error('❌ Unhandled backup error:', maskSecret(err.message));
    process.exit(1);
  });
}

