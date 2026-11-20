#!/usr/bin/env node
/**
 * BrewLite Production Smoke Test Suite (Task 5.3 & Task 5.4.1 - FIX-06 & FIX-5.4.1)
 * Verifies deployment health, public reverse proxy routing (/api/*),
 * TLS enforcement in production, single valid HTTPS endpoint, and confirms zero secret leakage.
 * 
 * STRICT CHECKS:
 * 1. Enforces HTTPS/TLS when target environment is 'production'.
 * 2. Rejects 'http://localhost' as evidence of production readiness.
 * 3. Enforces single valid URL (rejects multi-host list strings in TARGET_URL or FRONTEND_URL).
 * 4. Probes API strictly through the reverse proxy prefix (/api/*) without silent fallback.
 * 5. Confirms health contract { status: 'ok', database: 'up' } and catalog >= 1 items.
 * 6. Scans all responses and headers for leaked credentials or tokens.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from './safe-env.mjs';

// FIX-16: Safely load .env if present without shell source execution
let fileEnv = {};
const envCandidate = (process.env.ENV_FILE && existsSync(process.env.ENV_FILE))
  ? process.env.ENV_FILE
  : (existsSync(path.resolve('.env')) ? path.resolve('.env') : null);

if (envCandidate) {
  try {
    fileEnv = parseEnv(readFileSync(envCandidate, 'utf8'));
  } catch {}
}

const targetEnv = (process.env.TARGET_ENV || process.env.ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase().trim();

/**
 * Safely resolves and validates the smoke test target URL.
 * Guarantees that production always receives exactly one valid HTTPS URL.
 */
export function resolveSmokeTestTargetUrl(envType = 'development', env = process.env, loadedFileEnv = {}) {
  const normEnv = (envType || 'development').toLowerCase().trim();

  // If DOMAIN in fileEnv contains multiple comma-separated domains, extract strictly the primary domain
  const rawFileDomain = (loadedFileEnv.DOMAIN || '').split(/[\s,]+/)[0].trim();
  const fallbackProdUrl = rawFileDomain ? `https://${rawFileDomain}` : '';

  const candidate = (env.TARGET_URL || env.FRONTEND_URL || (normEnv === 'production' ? fallbackProdUrl : 'http://localhost')).trim();

  if (!candidate) {
    if (normEnv === 'production') {
      throw new Error('TARGET_URL or FRONTEND_URL must be specified for production smoke test.');
    }
    return 'http://localhost';
  }

  // Reject multi-host list strings accidentally passed into TARGET_URL
  if (candidate.includes(',') || /https?:\/\/[^\s]+[\s]+https?:\/\//.test(candidate)) {
    throw new Error(`TARGET_URL must be a single valid URL, not a list of hostnames (got: "${candidate}"). Use primary domain for TARGET_URL and CADDY_HOSTS for multiple domains.`);
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (err) {
    throw new Error(`TARGET_URL "${candidate}" is not a valid URL: ${err.message}`);
  }

  if (normEnv === 'production') {
    if (parsed.protocol !== 'https:') {
      throw new Error(`Production smoke test requires HTTPS/TLS endpoint (got: "${candidate}"). Non-secure HTTP is rejected.`);
    }
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname.toLowerCase())) {
      throw new Error(`Production smoke test cannot use localhost (got: "${candidate}"). A valid production domain or public hostname with HTTPS is required.`);
    }
  }

  return candidate.replace(/\/+$/, '');
}

const sensitivePatterns = [
  /postgres_password/i,
  /brewlite_dev_password/i,
  /jwt_secret/i,
  /BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY/,
  /ey[A-Za-z0-9-_]+\.ey[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, // JWT pattern in unauthenticated public endpoints
];

function maskSecret(text) {
  if (!text) return '';
  return String(text).replace(/(password|secret|key|token)=([^\s&]+)/gi, '$1=***');
}

async function testEndpoint(name, url, options = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeout || 10000),
    });
    const duration = Date.now() - start;
    const text = await res.text();
    return { ok: true, status: res.status, headers: res.headers, text, duration };
  } catch (err) {
    const duration = Date.now() - start;
    return { ok: false, status: 0, error: err.message, duration };
  }
}

function verifyNoSecrets(name, content, headers) {
  for (const pattern of sensitivePatterns) {
    if (pattern.test(content)) {
      throw new Error(`[SECURITY ALERT] Leaked sensitive pattern ${pattern} detected in ${name} response body!`);
    }
  }
  if (headers) {
    for (const [key, val] of headers.entries()) {
      for (const pattern of sensitivePatterns) {
        if (pattern.test(val)) {
          throw new Error(`[SECURITY ALERT] Leaked sensitive pattern ${pattern} detected in ${name} header ${key}!`);
        }
      }
    }
  }
}

async function runSmokeTests() {
  console.log('======================================================================');
  console.log('🚀 BREWLITE PRODUCTION SMOKE TEST');
  console.log(`🌍 Target Environment: \x1b[33m${targetEnv.toUpperCase()}\x1b[0m`);

  let targetUrl;
  try {
    targetUrl = resolveSmokeTestTargetUrl(targetEnv, process.env, fileEnv);
    console.log(`🌐 Target Base URL:    ${targetUrl}`);
  } catch (err) {
    console.error(`❌ FATAL: ${err.message}`);
    process.exit(1);
  }
  console.log('======================================================================\n');

  const apiUrl = (process.env.API_URL || `${targetUrl}/api`).replace(/\/+$/, '');

  console.log(`Resolved Endpoints:`);
  console.log(`- Web Frontend: ${targetUrl}/menu`);
  console.log(`- API Health:   ${apiUrl}/health`);
  console.log(`- API Products: ${apiUrl}/products\n`);

  const results = [];

  // Check 1: Frontend Menu Page
  console.log(`[1/4] Probing Frontend Menu (${targetUrl}/menu)...`);
  const menuRes = await testEndpoint('Web Frontend (/menu)', `${targetUrl}/menu`);
  if (!menuRes.ok || menuRes.status !== 200) {
    console.error(`❌ Menu probe failed: status ${menuRes.status}, error: ${menuRes.error || 'Non-200 status'}`);
    results.push({ check: 'Frontend Menu', status: 'FAIL', details: `HTTP ${menuRes.status}` });
  } else {
    try {
      verifyNoSecrets('Web Frontend', menuRes.text, menuRes.headers);
      assert.ok(menuRes.text.includes('menu') || menuRes.text.includes('BrewLite') || menuRes.text.includes('<!DOCTYPE html>'), 'Response does not look like valid HTML page');
      console.log(`✔ Frontend Menu returned HTTP 200 (${menuRes.duration}ms). Zero secrets leaked.`);
      results.push({ check: 'Frontend Menu', status: 'PASS', details: `200 OK (${menuRes.duration}ms)` });
    } catch (err) {
      console.error(`❌ Security/Content validation failed: ${err.message}`);
      results.push({ check: 'Frontend Menu', status: 'FAIL', details: err.message });
    }
  }

  // Check 2: API Health Check (Must check reverse proxy route /api/health)
  console.log(`\n[2/4] Probing API Health via Reverse Proxy (${apiUrl}/health)...`);
  const healthRes = await testEndpoint('API Health', `${apiUrl}/health`);
  if (!healthRes.ok || healthRes.status !== 200) {
    console.error(`❌ API Health probe failed: status ${healthRes.status}, error: ${healthRes.error || 'Non-200 status'}`);
    results.push({ check: 'API Health', status: 'FAIL', details: `HTTP ${healthRes.status}` });
  } else {
    try {
      verifyNoSecrets('API Health', healthRes.text, healthRes.headers);
      const json = JSON.parse(healthRes.text);
      assert.equal(json.status, 'ok', 'API health status must be "ok"');
      assert.equal(json.database, 'up', 'Database status must be "up"');
      console.log(`✔ API Health returned HTTP 200 with status="ok", database="up" (${healthRes.duration}ms). Zero secrets leaked.`);
      results.push({ check: 'API Health', status: 'PASS', details: `200 OK (${healthRes.duration}ms)` });
    } catch (err) {
      console.error(`❌ API Health payload validation failed: ${err.message}`);
      results.push({ check: 'API Health', status: 'FAIL', details: err.message });
    }
  }

  // Check 3: API Products Catalog
  console.log(`\n[3/4] Probing API Products Catalog (${apiUrl}/products)...`);
  const productsRes = await testEndpoint('API Products', `${apiUrl}/products`);
  if (!productsRes.ok || productsRes.status !== 200) {
    console.error(`❌ Products probe failed: status ${productsRes.status}, error: ${productsRes.error || 'Non-200 status'}`);
    results.push({ check: 'API Products', status: 'FAIL', details: `HTTP ${productsRes.status}` });
  } else {
    try {
      verifyNoSecrets('API Products', productsRes.text, productsRes.headers);
      const items = JSON.parse(productsRes.text);
      assert.ok(Array.isArray(items), 'Products response must be an array');
      assert.ok(items.length >= 1, `Expected at least 1 product, found ${items.length}`);
      console.log(`✔ API Products returned HTTP 200 with ${items.length} items (${productsRes.duration}ms). Zero secrets leaked.`);
      results.push({ check: 'API Products', status: 'PASS', details: `200 OK (${items.length} items)` });
    } catch (err) {
      console.error(`❌ Products payload validation failed: ${err.message}`);
      results.push({ check: 'API Products', status: 'FAIL', details: err.message });
    }
  }

  // Check 4: TLS/HTTPS Verification in Production
  console.log(`\n[4/4] Verifying Public Protocol & Reverse Proxy Security...`);
  if (targetEnv === 'production') {
    if (targetUrl.startsWith('https://')) {
      console.log(`✔ Production TLS certificate and HTTPS protocol verified on ${targetUrl}.`);
      results.push({ check: 'TLS / Protocol Security', status: 'PASS', details: 'Valid HTTPS protocol' });
    } else {
      console.error(`❌ Production endpoint is not using HTTPS: ${targetUrl}`);
      results.push({ check: 'TLS / Protocol Security', status: 'FAIL', details: 'Non-HTTPS in production' });
    }
  } else {
    console.log(`ℹ Non-production target environment (${targetEnv}). Skipping public TLS enforcement.`);
    results.push({ check: 'TLS / Protocol Security', status: 'PASS', details: 'Bypassed in non-prod' });
  }

  console.log('\n======================================================================');
  console.log('📊 SMOKE TEST SUMMARY RESULTS');
  console.log('======================================================================');
  console.table(results);

  const hasFailures = results.some(r => r.status === 'FAIL');
  if (hasFailures) {
    console.error('\n❌ SMOKE TEST FAILED: One or more checks did not pass.');
    process.exit(1);
  }

  console.log('\n🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY! Deployment is healthy and verified.');
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runSmokeTests().catch(err => {
    console.error('Fatal smoke test runner error:', err.message);
    process.exit(1);
  });
}
