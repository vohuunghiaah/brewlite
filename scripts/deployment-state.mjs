/**
 * BrewLite Deployment State Management Helper (Task 5.3 - FIX-02)
 * Durably records and retrieves currently running / previous known-good
 * container image references and digests before updates.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const DEFAULT_STATE_FILE = path.join(root, '.deployment-state.json');

export function loadDeploymentState(filePath = DEFAULT_STATE_FILE) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('⚠️ Failed to parse deployment state file:', err.message);
    return null;
  }
}

export function saveDeploymentState(state, filePath = DEFAULT_STATE_FILE) {
  const content = JSON.stringify(state, null, 2) + '\n';
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o600 });
  try { chmodSync(filePath, 0o600); } catch {}
}

/**
 * Inspects currently running containers and saves their image references to state file.
 */
export function captureRunningImages(options = {}) {
  const apiContainer = options.apiContainer || process.env.API_CONTAINER || 'brewlite-prod-api';
  const webContainer = options.webContainer || process.env.WEB_CONTAINER || 'brewlite-prod-web';
  const stateFile = options.stateFile || DEFAULT_STATE_FILE;

  let currentApiImage = null;
  let currentWebImage = null;

  try {
    const apiImg = execFileSync('docker', ['inspect', '--format', '{{.Config.Image}}', apiContainer], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (apiImg) currentApiImage = apiImg;
  } catch {}

  try {
    const webImg = execFileSync('docker', ['inspect', '--format', '{{.Config.Image}}', webContainer], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (webImg) currentWebImage = webImg;
  } catch {}

  if (currentApiImage && currentWebImage) {
    const state = {
      previousApiImage: currentApiImage,
      previousWebImage: currentWebImage,
      recordedAt: new Date().toISOString(),
    };
    saveDeploymentState(state, stateFile);
    console.log(`✔ Recorded running images into ${path.basename(stateFile)}:`);
    console.log(`  - API: ${currentApiImage}`);
    console.log(`  - Web: ${currentWebImage}`);
    return state;
  }

  return null;
}

if (process.argv[1] && process.argv[1].endsWith('deployment-state.mjs')) {
  captureRunningImages();
}

