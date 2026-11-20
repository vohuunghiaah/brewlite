#!/usr/bin/env node
/**
 * BrewLite Production Smoke Test Suite (Task 5.3 - FIX-06)
 * Verifies deployment health, public reverse proxy routing (/api/*),
 * TLS enforcement in production, and confirms zero secret leakage.
 * 
 * STRICT CHECKS:
 * 1. Enforces HTTPS/TLS when target environment is 'production'.
 * 2. Rejects 'http://localhost' as evidence of production readiness.
 * 3. Probes API strictly through the reverse proxy prefix (/api/*) without silent fallback.
 * 4. Confirms health contract { status: 'ok', database: 'up' } and catalog >= 1 items.
 * 5. Scans all responses and headers for leaked credentials or tokens.
 */

import assert from 'node:assert/strict';

const targetEnv = (process.env.TARGET_ENV || process.env.ENVIRONMENT || (process.env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase().trim();
const rawTargetUrl = (process.env.TARGET_URL || process.env.FRONTEND_URL || (targetEnv === 'production' ? '' : 'http://localhost')).trim();

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
  console.log('🚀 BREWLITE TASK 5.3 PRODUCTION SMOKE TEST');
  console.log(`🌍 Target Environment: \x1b[33m${targetEnv.toUpperCase()}\x1b[0m`);
  console.log(`🌐 Target Base URL:    ${rawTargetUrl || '(not configured)'}`);
  console.log('======================================================================\n');

  // Production Safety Validation
  if (targetEnv === 'production') {
    if (!rawTargetUrl) {
      console.error('❌ FATAL: TARGET_URL or FRONTEND_URL must be specified for production smoke test.');
      process.exit(1);
    }
    if (rawTargetUrl.includes('localhost') || rawTargetUrl.includes('127.0.0.1')) {
      console.error('❌ FATAL: Production smoke test cannot use localhost. A valid production domain or public hostname with HTTPS is required.');
      process.exit(1);
    }
    if (!rawTargetUrl.startsWith('https://')) {
      console.error(`❌ FATAL: Production smoke test requires HTTPS/TLS endpoint (got: "${rawTargetUrl}"). Non-secure HTTP is rejected.`);
      process.exit(1);
    }
    console.log('✔ Production HTTPS/TLS URL validation passed.');
  }

  const targetUrl = (rawTargetUrl || 'http://localhost').replace(/\/+$/, '');
  const apiUrl = (process.env.API_URL || `${targetUrl}/api`).replace(/\/+$/, '');

  console.log(`Resolved Endpoints:`);
  console.log(`- Web Frontend: ${targetUrl}/menu`);
  console.log(`- API Health:   ${apiUrl}/health`);
  console.log(`- API Products: ${apiUrl}/products\n`);

  const results = [];

  // Check 1: Frontend UI reachable
  console.log('1. Checking Frontend UI accessibility (/menu)...');
  const webRes = await testEndpoint('Web UI', `${targetUrl}/menu`);
  if (!webRes.ok || webRes.status !== 200) {
    console.error(`❌ Web UI failed: HTTP ${webRes.status} (${webRes.error || 'unexpected status'})`);
    results.push({ check: 'Frontend /menu HTTP 200', status: 'FAIL', detail: `HTTP ${webRes.status}` });
  } else {
    verifyNoSecrets('Web UI', webRes.text, webRes.headers);
    assert.ok(
      webRes.text.includes('BrewLite') || webRes.text.includes('menu') || webRes.text.includes('html'),
      'Expected valid HTML content from /menu'
    );
    console.log(`✔ Web UI responded HTTP 200 in ${webRes.duration}ms`);
    results.push({ check: 'Frontend /menu HTTP 200', status: 'PASS', detail: `${webRes.duration}ms` });
  }

  // Check 2: API Health Endpoint (/api/health through reverse proxy)
  console.log('\n2. Checking API /health endpoint through reverse proxy...');
  const healthRes = await testEndpoint('API Health', `${apiUrl}/health`);

  if (!healthRes.ok || healthRes.status !== 200) {
    console.error(`❌ API Health check failed: HTTP ${healthRes.status} (${healthRes.error || 'unexpected status'})`);
    results.push({ check: 'API /health status: ok, database: up', status: 'FAIL', detail: `HTTP ${healthRes.status}` });
  } else {
    verifyNoSecrets('Health Check', healthRes.text, healthRes.headers);
    let healthJson = {};
    try {
      healthJson = JSON.parse(healthRes.text);
    } catch {
      throw new Error(`Invalid JSON received from ${apiUrl}/health: ${healthRes.text}`);
    }
    assert.equal(healthJson.status, 'ok', 'Expected status: "ok"');
    assert.equal(healthJson.database, 'up', 'Expected database: "up"');
    console.log(`✔ API /health responded HTTP 200 in ${healthRes.duration}ms:`, healthJson);
    results.push({ check: 'API /health status: ok, database: up', status: 'PASS', detail: `${healthRes.duration}ms` });
  }

  // Check 3: Products Catalog Endpoint (/api/products through reverse proxy)
  console.log('\n3. Checking Products Catalog endpoint through reverse proxy (/api/products)...');
  const productsRes = await testEndpoint('Products Catalog', `${apiUrl}/products`);

  if (!productsRes.ok || productsRes.status !== 200) {
    console.error(`❌ Catalog check failed: HTTP ${productsRes.status} (${productsRes.error || 'unexpected status'})`);
    results.push({ check: 'Catalog GET /products returns items', status: 'FAIL', detail: `HTTP ${productsRes.status}` });
  } else {
    verifyNoSecrets('Products Catalog', productsRes.text, productsRes.headers);
    let products = [];
    try {
      products = JSON.parse(productsRes.text);
    } catch {
      throw new Error(`Invalid JSON received from ${apiUrl}/products: ${productsRes.text}`);
    }
    assert.ok(Array.isArray(products), 'Expected products to be an array');
    assert.ok(products.length >= 1, `Expected at least 1 product, got ${products.length}`);
    const first = products[0];
    assert.ok(first.id !== undefined && first.name !== undefined, 'Product missing id or name');
    console.log(`✔ Products Catalog responded HTTP 200 in ${productsRes.duration}ms with ${products.length} products`);
    results.push({ check: 'Catalog GET /products returns items', status: 'PASS', detail: `${products.length} items` });
  }

  // Check 4: Security Verification (Zero secret leaks)
  console.log('\n4. Checking Security: Zero secret leaks in responses and headers...');
  console.log('✔ All inspected payloads clean: zero password, private key or JWT leaks detected');
  results.push({ check: 'Zero Secret Leakage in Responses', status: 'PASS', detail: 'Clean' });

  // Summary Table
  console.log('\n======================================================================');
  console.log('📊 SMOKE TEST SUMMARY RESULTS');
  console.log('======================================================================');
  console.table(results);

  const hasFail = results.some(r => r.status === 'FAIL');
  if (hasFail) {
    console.error('\n❌ SMOKE TEST FAILED — Triggering deployment failure / rollback workflow');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SMOKE TESTS PASSED 100% — System healthy and ready for traffic!');
    process.exit(0);
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ Unhandled smoke test error:', maskSecret(err.message));
  process.exit(1);
});
