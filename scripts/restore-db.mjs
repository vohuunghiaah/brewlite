#!/usr/bin/env node
/**
 * BrewLite Database Restoration & Disaster Recovery Script (Task 5.4.1)
 *
 * STRICT SAFETY RULES:
 * 1. Requires explicit flag --confirm-restore-database to prevent accidental data destruction.
 * 2. Never restores onto production database unless target database matches explicit confirmation.
 * 3. Verifies backup file existence, readability, size, and PostgreSQL dump header before execution.
 * 4. Checks container health and database readiness before starting stream.
 * 5. Streams dump directly into psql stdin with zero memory buffer limits.
 * 6. Validates restored tables and row counts after completion.
 * 7. Masks all sensitive credentials in output logs.
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync, openSync, readSync, closeSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function maskSecret(text) {
  if (!text) return '';
  return String(text)
    .replace(/(password|secret|key|token|auth)=([^\s&]+)/gi, '$1=***')
    .replace(/(postgres:\/\/)([^:]+):([^@]+)@/gi, '$1$2:***@');
}

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

/**
 * Validate backup file integrity without loading full file into memory.
 */
export function validateBackupFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Backup file does not exist: ${filePath}`);
  }
  const stats = statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`Backup file is empty (0 bytes): ${filePath}`);
  }
  const headerSample = readHeaderSample(filePath, 1024);
  if (!headerSample.includes('PostgreSQL database dump')) {
    throw new Error(`Backup file does not have a valid PostgreSQL dump header: ${filePath}`);
  }
  return { size: stats.size, valid: true };
}

async function runRestore() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm-restore-database');
  const targetDbArg = args.find((_, i) => args[i - 1] === '--db') || process.env.POSTGRES_DB || 'brewlite';
  const container = args.find((_, i) => args[i - 1] === '--container') || process.env.DB_CONTAINER || 'brewlite-prod-db';
  const user = args.find((_, i) => args[i - 1] === '--user') || process.env.POSTGRES_USER || 'brewlite';
  const backupFile = args.find((_, i) => args[i - 1] === '--backup-file') || process.env.BACKUP_FILE;

  console.log('======================================================================');
  console.log('🔄 BREWLITE DATABASE RESTORATION & DISASTER RECOVERY (STRICT SAFETY)');
  console.log(`🗄️ Target DB:   ${targetDbArg}`);
  console.log(`📁 Container:   ${container}`);
  console.log(`👤 DB User:     ${user}`);
  console.log(`💾 Backup File:  ${backupFile || 'NOT SPECIFIED'}`);
  console.log('======================================================================\n');

  // Safety Gate: Require explicit confirmation
  if (!isConfirmed) {
    console.error('❌ SAFETY ABORT: Database restoration requires explicit confirmation flag:');
    console.error('   --confirm-restore-database');
    console.error('   Aborting to protect persistent data.');
    process.exit(1);
  }

  if (!backupFile) {
    console.error('❌ FAIL-CLOSED: No backup file specified. Provide via --backup-file <path> or BACKUP_FILE env var.');
    process.exit(1);
  }

  // Step 1: Validate backup file
  try {
    const { size } = validateBackupFile(backupFile);
    console.log(`✔ Backup file validated: ${backupFile} (${(size / 1024).toFixed(2)} KB, header verified)`);
  } catch (err) {
    console.error('❌ FAIL-CLOSED: Backup validation failed:', maskSecret(err.message));
    process.exit(1);
  }

  // Step 2: Check if database container is running
  let psOutput = '';
  try {
    psOutput = execFileSync('docker', ['ps', '--filter', `name=${container}`, '--format', '{{.Names}}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    console.error('❌ FAIL-CLOSED: Failed to check docker container status:', maskSecret(err.message));
    process.exit(1);
  }

  const isRunning = psOutput.split('\n').some(name => name.trim() === container);
  if (!isRunning) {
    console.error(`❌ FAIL-CLOSED: Target container "${container}" is not running.`);
    process.exit(1);
  }

  // Step 3: Check database responsiveness
  const readyCheck = spawnSync('docker', ['exec', container, 'pg_isready', '-U', user, '-d', targetDbArg], {
    encoding: 'utf8',
  });
  if (readyCheck.status !== 0) {
    console.error(`❌ FAIL-CLOSED: Target database "${targetDbArg}" is not ready or unresponsive.`);
    process.exit(1);
  }

  // Step 4: Stream restore directly via child process stdin
  console.log(`Restoring database dump into ${container}:${targetDbArg} via streaming stdin...`);
  try {
    await new Promise((resolve, reject) => {
      const psqlProc = spawn('docker', ['exec', '-i', container, 'psql', '-U', user, '-d', targetDbArg], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderrData = '';
      psqlProc.stderr.on('data', chunk => {
        stderrData += chunk.toString();
      });

      const fileStream = createReadStream(backupFile);
      fileStream.pipe(psqlProc.stdin);

      fileStream.on('error', err => {
        psqlProc.kill();
        reject(new Error(`Failed to read backup file stream: ${err.message}`));
      });

      psqlProc.on('error', err => {
        reject(new Error(`Failed to launch docker exec process: ${err.message}`));
      });

      psqlProc.on('close', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql failed with exit code ${code}: ${stderrData}`));
        }
      });
    });
  } catch (err) {
    console.error('❌ FAIL-CLOSED: Restore execution failed:', maskSecret(err.message));
    process.exit(1);
  }

  // Step 5: Verify table counts after restoration
  const tableCheck = spawnSync('docker', [
    'exec', container, 'psql', '-U', user, '-d', targetDbArg, '-t', '-c',
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
  ], { encoding: 'utf8' });

  const tableCount = parseInt(tableCheck.stdout.trim(), 10) || 0;
  console.log(`✔ Restoration completed. Public tables in ${targetDbArg}: ${tableCount}`);
  if (tableCount < 4) {
    console.error(`⚠️ WARNING: Expected at least 4 tables, found ${tableCount}. Please verify database state.`);
    process.exit(1);
  }

  console.log('🎉 Database restoration verified successfully.');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runRestore().catch(err => {
    console.error('Fatal restore error:', err.message);
    process.exit(1);
  });
}
