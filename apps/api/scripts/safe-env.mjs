/**
 * Safe Environment Serialization & Parsing Utility for BrewLite Deployment (FIX-16 & FIX-5.4.1)
 *
 * Implements safe, injection-proof serialization and parsing for .env files compatible with:
 * 1. Docker Compose v2 specification (proper double-quoted escaping: \", \\, \$, \n, \r, \t)
 * 2. Node.js deployment & rollback automation scripts
 * 3. Remote Bash execution WITHOUT ever using hazardous "source .env" or ". ./.env"
 * 4. Atomic file update with 0600 permissions preserving existing secrets
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Mask sensitive values in error logs to prevent credential leakage.
 */
export function maskSecret(str) {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= 4) return '***';
  return str.slice(0, 2) + '***' + str.slice(-2);
}

/**
 * Validate that an environment variable key is a safe, valid shell/dotenv identifier.
 */
export function validateKey(key) {
  if (typeof key !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`Invalid environment variable key: "${key}". Keys must match /^[A-Za-z_][A-Za-z0-9_]*$/`);
  }
  return key;
}

/**
 * Validate that an environment variable value contains only supported characters.
 * Rejects unsupported control characters or dangerous null bytes before deployment.
 */
export function validateValue(key, val) {
  if (val === undefined || val === null) {
    throw new Error(`Environment variable "${key}" cannot be null or undefined.`);
  }
  const str = String(val);
  // Reject null bytes and hazardous ASCII control characters (allow \t, \n, \r)
  const forbiddenControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (forbiddenControlChars.test(str)) {
    throw new Error(`Environment variable "${key}" contains unsupported control characters (null bytes or raw non-printable bytes).`);
  }
  return str;
}

/**
 * Escape a value for double-quoted dotenv serialization compatible with Docker Compose.
 * Docker Compose interpolates $ in double quotes unless escaped with \$ or $$.
 * In Compose, \$ inside double quotes is unescaped to literal $.
 */
export function escapeEnvValue(val) {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

/**
 * Serialize an object of key-value pairs into safe .env content.
 * Validates all keys and values, rejecting invalid or unsupported entries.
 */
export function serializeEnv(entries) {
  if (!entries || typeof entries !== 'object') {
    throw new Error('serializeEnv requires an object of key-value pairs.');
  }

  const lines = [];
  for (const [rawKey, rawVal] of Object.entries(entries)) {
    const key = validateKey(rawKey);
    const val = validateValue(key, rawVal);
    lines.push(`${key}=${escapeEnvValue(val)}`);
  }
  return lines.join('\n') + '\n';
}

/**
 * Safely parse a .env formatted string into an object of key-value pairs.
 * Does NOT execute any shell code, variable expansion, or command substitutions.
 */
export function parseEnv(content) {
  if (!content || typeof content !== 'string') {
    return {};
  }

  const result = {};
  const lines = content.split(/\r?\n/);

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx].trim();
    if (!rawLine || rawLine.startsWith('#')) {
      continue;
    }

    const eqIdx = rawLine.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }

    const key = rawLine.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    let val = rawLine.slice(eqIdx + 1).trim();

    if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
      val = val.slice(1, -1);
      let unescaped = '';
      for (let i = 0; i < val.length; i++) {
        if (val[i] === '\\' && i + 1 < val.length) {
          const next = val[i + 1];
          if (next === 'n') { unescaped += '\n'; i++; }
          else if (next === 'r') { unescaped += '\r'; i++; }
          else if (next === 't') { unescaped += '\t'; i++; }
          else if (next === '"') { unescaped += '"'; i++; }
          else if (next === '\\') { unescaped += '\\'; i++; }
          else if (next === '$') { unescaped += '$'; i++; }
          else { unescaped += next; i++; }
        } else {
          unescaped += val[i];
        }
      }
      val = unescaped;
    } else if (val.startsWith("'") && val.endsWith("'") && val.length >= 2) {
      val = val.slice(1, -1);
    }

    result[key] = val;
  }

  return result;
}

/**
 * Safely read and parse a .env file from disk.
 */
export function readEnvFile(filePath) {
  const resolved = path.resolve(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`Environment file not found: ${resolved}`);
  }
  const content = readFileSync(resolved, 'utf8');
  return parseEnv(content);
}

/**
 * Update or set keys in a .env file on disk safely without losing existing keys or leaking secrets.
 * Writes atomically with 0600 mode.
 */
export function updateEnvFile(filePath, updates) {
  if (!updates || typeof updates !== 'object') {
    throw new Error('updateEnvFile requires an object of key-value updates.');
  }
  const resolved = path.resolve(filePath);
  const existing = existsSync(resolved) ? readEnvFile(resolved) : {};
  const merged = { ...existing };

  for (const [key, val] of Object.entries(updates)) {
    const validKey = validateKey(key);
    const validVal = validateValue(validKey, val);
    merged[validKey] = validVal;
  }

  const content = serializeEnv(merged);
  const tmpPath = `${resolved}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  
  writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
  renameSync(tmpPath, resolved);
  return merged;
}

export const updateEnv = updateEnvFile;

// CLI Execution Handler
if (process.argv[1] && process.argv[1].endsWith('safe-env.mjs')) {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'get') {
      const filePath = args[1];
      const key = args[2];
      if (!filePath || !key) {
        console.error('Usage: node scripts/safe-env.mjs get <filePath> <key>');
        process.exit(1);
      }
      const parsed = readEnvFile(filePath);
      const val = parsed[key];
      if (val !== undefined && val !== null) {
        process.stdout.write(String(val));
      }
      process.exit(0);
    } else if (command === 'set') {
      const filePath = args[1];
      const key = args[2];
      const val = args[3];
      if (!filePath || !key || val === undefined) {
        console.error('Usage: node scripts/safe-env.mjs set <filePath> <key> <val>');
        process.exit(1);
      }
      updateEnvFile(filePath, { [key]: val });
      console.log(`✔ Updated key "${key}" in ${filePath}`);
      process.exit(0);
    } else if (command === 'validate') {
      const filePath = args[1];
      const requiredKeys = args.slice(2);
      if (!filePath) {
        console.error('Usage: node scripts/safe-env.mjs validate <filePath> [requiredKey1 ...]');
        process.exit(1);
      }
      const parsed = readEnvFile(filePath);
      const missing = [];
      for (const reqKey of requiredKeys) {
        if (!parsed[reqKey] || String(parsed[reqKey]).trim() === '') {
          missing.push(reqKey);
        }
      }
      if (missing.length > 0) {
        console.error(`❌ Validation failed: Missing or empty required keys: ${missing.join(', ')}`);
        process.exit(1);
      }
      console.log(`✔ Environment file ${filePath} is valid. All ${requiredKeys.length} required keys present.`);
      process.exit(0);
    } else {
      console.error(`Unknown command: ${command}`);
      console.error('Available commands: get, set, validate');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ safe-env error:', maskSecret(err.message));
    process.exit(1);
  }
}
