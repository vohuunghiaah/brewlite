import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { get } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { queryDb, verifyLiveDatabase } from './env-safety.mjs';

import { newTestProject, prepareTestCompose } from './isolated-test-compose.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = newTestProject();
const temp = mkdtempSync(path.join(tmpdir(), project));
const evidence = path.join(root, 'test-results', project);
mkdirSync(evidence, { recursive: true });
const envFile = path.join(temp, 'compose.env');
const webPort = process.env.TEST_WEB_PORT || '15300';
const apiPort = process.env.TEST_API_PORT || '15301';
const settings = {
  POSTGRES_DB: 'brewlite_acceptance_test', POSTGRES_USER: 'brewlite',
  POSTGRES_PORT: process.env.TEST_DB_PORT || '15432',
  POSTGRES_PASSWORD: randomBytes(32).toString('hex'),
  JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: '1d',
  WEB_PORT: webPort, API_PORT: apiPort,
  NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}`, API_INTERNAL_URL: 'http://api:3001',
  FRONTEND_URL: `http://localhost:${webPort}`,
  DB_CONTAINER: project + '-db', API_CONTAINER: project + '-api', WEB_CONTAINER: project + '-web',
};
writeFileSync(envFile, Object.entries(settings).map(([k, v]) => k + '=' + v).join('\n') + '\n', { mode: 0o600 });
const env = {
  ...process.env, ...settings, BREWLITE_ENV_FILE: envFile,
  DB_NAME: settings.POSTGRES_DB, DB_USER: settings.POSTGRES_USER, NODE_ENV: 'test',
  RUN_PG_TESTS: 'false', DB_DIRECT_PSQL: 'false',
  WEB_URL: settings.FRONTEND_URL, API_URL: settings.NEXT_PUBLIC_API_URL,
  SCREENSHOT_DIR: evidence, ARTIFACTS_DIR: '',
};
function run(file, args) {
  execFileSync(file, args, { cwd: root, env, stdio: 'inherit', timeout: 600000 });
}
const { compose, cleanup } = prepareTestCompose(project,
  ['-f', 'docker-compose.yml', '-f', 'compose.test.yml', '--env-file', envFile], { cwd: root, env });
function script(name) {
  run(process.execPath, ['scripts/' + name]);
}
async function health(status, body) {
  // Child processes block the parent event loop between probes. Each external probe
  // needs a fresh socket, including the first one after stopping PostgreSQL.
  const response = await new Promise((resolve, reject) => {
    get(env.API_URL + '/health', { agent: false, signal: AbortSignal.timeout(5000) }, resolve)
      .on('error', reject);
  });
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  assert.equal(response.statusCode, status);
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), body);
  console.log('GET /health', status, body);
}
const sql = statement => queryDb(statement, env);
try {
  console.log('Project', project, 'evidence', evidence);
  compose('build');
  compose('up', '-d', '--wait', '--wait-timeout', '90', 'db');
  verifyLiveDatabase(env);
  const tables = sql("SELECT count(*) FROM pg_tables WHERE schemaname='public'");
  assert.equal(tables, '0');
  console.log('Empty database verified:', tables, 'tables');
  const setup = command => compose('run', '--rm', '--no-deps', '-T', 'api', 'npm', 'run', command);
  const snapshot = () => sql('SELECT id, name, price, stock, version FROM products ORDER BY id');
  setup('db:migrate');
  setup('db:seed');
  assert.equal(sql('SELECT count(*) FROM migrations'), '4');
  assert.equal(sql('SELECT count(*) FROM products'), '15');
  assert.equal(sql("SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='role'"), '0');
  // Simulate an inventory correction. A second seed must preserve it.
  sql('UPDATE products SET stock = stock + 1 WHERE id = (SELECT min(id) FROM products)');
  const before = snapshot();
  setup('db:migrate');
  setup('db:seed');
  assert.equal(sql('SELECT count(*) FROM migrations'), '4');
  assert.equal(snapshot(), before);
  console.log('Repeated setup preserved migrations and 15 catalog rows:\n' + before);

  if (process.argv.includes('--quality')) {
    // The legacy concurrency suite clears gateway fixtures. Give it its own database.
    sql('CREATE DATABASE brewlite_jest_test');
    const job = (app, command, ...args) => compose('run', '--rm', '--no-deps', '-T',
      '-e', `NODE_ENV=${command === 'build' ? 'production' : 'test'}`,
      '-e', 'POSTGRES_HOST=db', '-e', 'POSTGRES_PORT=5432', '-e', 'POSTGRES_DB=brewlite_jest_test',
      app, 'npm', 'run', command, ...args);
    job('api', 'lint');
    job('api', 'test', '--', '--runInBand', '--verbose');
    job('api', 'build');
    job('web', 'lint');
    job('web', 'test:unit');
    job('web', 'test:component', '--', '--runInBand');
    job('web', 'build');
  }

  compose('up', '-d', '--wait', '--wait-timeout', '180');
  compose('ps');
  await health(200, { status: 'ok', database: 'up' });
  assert.equal((await (await fetch(env.API_URL + '/products')).json()).length, 15);
  script('test-env-safety.mjs');
  script('e2e-mvp-acceptance.mjs');
  script('e2e-security-exceptions.mjs');

  compose('stop', 'db');
  await health(503, { status: 'error', database: 'down' });
  compose('up', '-d', '--wait', '--wait-timeout', '90', 'db');
  await health(200, { status: 'ok', database: 'up' });
} catch (error) {
  compose('ps', '--all');
  throw error;
} finally {
  try {
    cleanup('--rmi', 'local');
  } finally {
    rmSync(envFile, { force: true });
    rmdirSync(temp);
  }
}
