#!/usr/bin/env node
/**
 * BrewLite Database Restoration & Disaster Recovery Script (Task 5.4.1 - FIX-5.4.1)
 *
 * STRICT SAFETY & ISOLATION RULES:
 * 1. Default mode: ONLY permits restoring into explicitly specified isolated/test databases.
 * 2. Rejects any operation targeting production environments in standard mode.
 * 3. Never falls back to production database or container names by default. Both --container and --db are required.
 * 4. Production Disaster Recovery requires a multi-step manual confirmation gate:
 *    --disaster-recovery-production
 *    --confirm-restore-database
 *    --acknowledge-destructive-overwrite
 *    --confirm-target-db <exact-db-name>
 * 5. Full backup integrity verification: validates BOTH header (PostgreSQL database dump) AND tail (PostgreSQL database dump complete).
 * 6. Executes psql with ON_ERROR_STOP=1 to halt immediately on any SQL statement error.
 * 7. Streams dump directly into psql stdin with zero heap memory limits.
 * 8. Comprehensive post-restore verification: validates schema tables, row counts, and sample record read-back.
 * 9. Masks all sensitive credentials in output logs.
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, statSync, openSync, readSync, closeSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function maskSecret(text) {
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

export function readTailSample(filePath, sampleSize = 2048) {
  const fd = openSync(filePath, 'r');
  try {
    const stats = statSync(filePath);
    const readSize = Math.min(stats.size, sampleSize);
    const position = Math.max(0, stats.size - readSize);
    const buffer = Buffer.alloc(readSize);
    const bytesRead = readSync(fd, buffer, 0, readSize, position);
    return buffer.toString('utf8', 0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

/**
 * Validate backup file integrity without loading full file into memory.
 * Checks both the header magic marker and the completion footer.
 */
export function validateBackupFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Backup file does not exist: ${filePath}`);
  }
  const stats = statSync(filePath);
  if (stats.size === 0) {
    throw new Error(`Backup file is empty (0 bytes): ${filePath}`);
  }

  // 1. Validate dump header
  const headerSample = readHeaderSample(filePath, 1024);
  if (!headerSample.includes('PostgreSQL database dump')) {
    throw new Error(`Backup file does not have a valid PostgreSQL dump header: ${filePath}`);
  }

  // 2. Validate dump completion footer (proves backup was not interrupted mid-write)
  const tailSample = readTailSample(filePath, 2048);
  if (!tailSample.includes('PostgreSQL database dump complete')) {
    throw new Error(`Backup file is incomplete or truncated (missing '-- PostgreSQL database dump complete' footer): ${filePath}`);
  }

  return { size: stats.size, valid: true };
}

/**
 * Detect whether target container or database represents a production environment.
 */
export function isProductionTarget(container, database) {
  const isProdContainer = /prod/i.test(container || '');
  const isProdDb = /^(brewlite|brewlite_prod|production)$/i.test(database || '');
  return isProdContainer || isProdDb;
}

async function runRestore() {
  const args = process.argv.slice(2);
  const isConfirmed = args.includes('--confirm-restore-database');
  const isDisasterRecovery = args.includes('--disaster-recovery-production');
  const isOverwriteAck = args.includes('--acknowledge-destructive-overwrite');

  const targetDbArg = args.find((_, i) => args[i - 1] === '--db');
  const container = args.find((_, i) => args[i - 1] === '--container');
  const user = args.find((_, i) => args[i - 1] === '--user') || 'brewlite';
  const backupFile = args.find((_, i) => args[i - 1] === '--backup-file') || process.env.BACKUP_FILE;
  const confirmedDbName = args.find((_, i) => args[i - 1] === '--confirm-target-db');

  console.log('======================================================================');
  console.log('🔄 BREWLITE DATABASE RESTORATION & DISASTER RECOVERY (STRICT SAFETY)');
  console.log(`🗄️ Target DB:   ${targetDbArg || 'NOT SPECIFIED (REQUIRED)'}`);
  console.log(`📁 Container:   ${container || 'NOT SPECIFIED (REQUIRED)'}`);
  console.log(`👤 DB User:     ${user}`);
  console.log(`💾 Backup File:  ${backupFile || 'NOT SPECIFIED'}`);
  console.log(`🛡️ DR Mode:     ${isDisasterRecovery ? 'PRODUCTION DISASTER RECOVERY' : 'ISOLATED / TEST'}`);
  console.log('======================================================================\n');

  // Rule 1: Confirmation flag is mandatory
  if (!isConfirmed) {
    console.error('❌ SAFETY ABORT: Database restoration requires explicit confirmation flag:');
    console.error('   --confirm-restore-database');
    console.error('   Aborting to protect persistent data.');
    process.exit(1);
  }

  // Rule 2: Explicit container and database are required (Zero implicit production fallback)
  if (!container || !targetDbArg) {
    console.error('❌ FAIL-CLOSED: Target container and database must be explicitly specified.');
    console.error('   Provide both --container <name> and --db <database_name>.');
    console.error('   Zero implicit defaults to production environments are permitted.');
    process.exit(1);
  }

  if (!backupFile) {
    console.error('❌ FAIL-CLOSED: No backup file specified. Provide via --backup-file <path> or BACKUP_FILE env var.');
    process.exit(1);
  }

  // Rule 3: Protection against accidental production overwrites
  const targetingProduction = isProductionTarget(container, targetDbArg);
  if (targetingProduction) {
    if (!isDisasterRecovery || !isOverwriteAck || confirmedDbName !== targetDbArg) {
      console.error('❌ CRITICAL SAFETY GATE: Target matches production environment patterns:');
      console.error(`   Container: "${container}", Database: "${targetDbArg}"`);
      console.error('   Restoring to production is STRICTLY BLOCKED in standard mode.');
      console.error('   Production disaster recovery requires ALL of the following:');
      console.error('   1. --disaster-recovery-production');
      console.error('   2. --confirm-restore-database');
      console.error('   3. --acknowledge-destructive-overwrite');
      console.error(`   4. --confirm-target-db "${targetDbArg}"`);
      console.error('   Aborting to protect live production data.');
      process.exit(1);
    }
    console.warn('⚠️ WARNING: PRODUCTION DISASTER RECOVERY MODE ACTIVATED WITH EXPLICIT OPERATOR CONFIRMATION.');
  }

  // Step 1: Validate backup file (header and footer)
  try {
    const { size } = validateBackupFile(backupFile);
    console.log(`✔ Backup file validated: ${backupFile} (${(size / 1024).toFixed(2)} KB, header & footer verified)`);
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

  // Step 4: Stream restore directly via child process stdin with ON_ERROR_STOP=1
  console.log(`Restoring database dump into ${container}:${targetDbArg} via streaming stdin (ON_ERROR_STOP=1)...`);
  try {
    await new Promise((resolve, reject) => {
      // FIX-5.4.1: psql with -v ON_ERROR_STOP=1 halts immediately on any SQL statement error
      const psqlProc = spawn('docker', [
        'exec', '-i', container,
        'psql', '-U', user, '-d', targetDbArg,
        '-v', 'ON_ERROR_STOP=1'
      ], {
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

  // Step 5: Comprehensive post-restore verification:
  // Check required tables, count rows, and read back sample data to prevent false PASS
  console.log('Verifying restored schema and data integrity...');

  // A. Check required schema tables exist
  const tableCheck = spawnSync('docker', [
    'exec', container, 'psql', '-U', user, '-d', targetDbArg, '-t', '-A', '-c',
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  ], { encoding: 'utf8' });

  if (tableCheck.status !== 0) {
    console.error('❌ FAIL-CLOSED: Failed to inspect public tables after restore:', maskSecret(tableCheck.stderr));
    process.exit(1);
  }

  const publicTables = tableCheck.stdout.trim().split('\n').map(t => t.trim()).filter(Boolean);
  console.log(`✔ Found ${publicTables.length} public tables in ${targetDbArg}: ${publicTables.join(', ')}`);

  const requiredTables = ['products', 'orders', 'order_items', 'users', 'migrations'];
  const missingTables = requiredTables.filter(t => !publicTables.includes(t));
  if (missingTables.length > 0) {
    console.error(`❌ VERIFICATION FAILED: Missing essential tables after restore: ${missingTables.join(', ')}`);
    process.exit(1);
  }

  // B. Read back actual data rows from restored tables
  const rowCheck = spawnSync('docker', [
    'exec', container, 'psql', '-U', user, '-d', targetDbArg, '-t', '-A', '-c',
    "SELECT 'products=' || count(*) FROM products UNION ALL SELECT 'migrations=' || count(*) FROM migrations;"
  ], { encoding: 'utf8' });

  if (rowCheck.status !== 0) {
    console.error('❌ FAIL-CLOSED: Failed to read row counts after restore:', maskSecret(rowCheck.stderr));
    process.exit(1);
  }

  const counts = Object.fromEntries(
    rowCheck.stdout.trim().split('\n').map(line => line.split('='))
  );

  const productCount = parseInt(counts['products'] || '0', 10);
  const migrationCount = parseInt(counts['migrations'] || '0', 10);
  console.log(`✔ Restored row counts: products = ${productCount}, migrations = ${migrationCount}`);

  if (productCount <= 0) {
    console.error('❌ VERIFICATION FAILED: products table is empty after restore.');
    process.exit(1);
  }
  if (migrationCount <= 0) {
    console.error('❌ VERIFICATION FAILED: migrations table has 0 applied migrations after restore.');
    process.exit(1);
  }

  // C. Sample data read-back verification (FIX-02: strictly fail-closed on query error or empty data)
  const sampleCheck = spawnSync('docker', [
    'exec', container, 'psql', '-U', user, '-d', targetDbArg, '-t', '-A', '-c',
    "SELECT name || ' (' || price || ')' FROM products ORDER BY id LIMIT 1;"
  ], { encoding: 'utf8' });

  if (sampleCheck.status !== 0) {
    console.error('❌ FAIL-CLOSED: Sample data read-back query failed:', maskSecret(sampleCheck.stderr));
    process.exit(1);
  }

  const sampleData = sampleCheck.stdout ? sampleCheck.stdout.trim() : '';
  if (!sampleData) {
    console.error('❌ VERIFICATION FAILED: Sample data read-back returned empty output. No valid records found in products table.');
    process.exit(1);
  }

  console.log(`✔ Sample product read-back verified: "${sampleData}"`);
  console.log('🎉 Database restoration verified successfully with real data read-back.');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runRestore().catch(err => {
    console.error('Fatal restore error:', err.message);
    process.exit(1);
  });
}
