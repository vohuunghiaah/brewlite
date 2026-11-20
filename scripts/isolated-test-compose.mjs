import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export function newTestProject() {
  return 'brewlite-test-' + randomUUID();
}

// Both harnesses declare exactly one local, project-scoped PostgreSQL volume.
export function prepareTestCompose(project, configArgs, options = {}) {
  assert.match(project, /^brewlite-test-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const key = 'postgres_data';
  const name = project + '_' + key;
  const base = ['compose', ...configArgs, '-p', project];
  function docker(args, stdio = ['ignore', 'pipe', 'inherit']) {
    return execFileSync('docker', args, { ...options, stdio, encoding: 'utf8', timeout: 600000 });
  }
  function validateConfig() {
    const model = JSON.parse(docker([...base, 'config', '--format', 'json']));
    assert.equal(model.name, project, 'unexpected Compose project');
    assert.deepEqual(Object.keys(model.volumes ?? {}), [key]);
    const volume = model.volumes[key];
    assert.equal(volume.name, name, 'expected a project-scoped volume');
    assert.ok(!volume.external && !volume.driver_opts && (!volume.driver || volume.driver === 'local'),
      'external, shared or custom-driver test volumes are forbidden');
    const mounts = Object.values(model.services).flatMap(service => service.volumes ?? []);
    assert.ok(mounts.length === 1 && mounts[0].type === 'volume' && mounts[0].source === key &&
      mounts[0].target === '/var/lib/postgresql/data', 'unexpected test mount');
  }
  function volumeExists() {
    return docker(['volume', 'ls', '--filter', 'name=' + name, '--format', '{{.Name}}'])
      .trim().split(/\r?\n/).includes(name);
  }
  validateConfig();
  assert.ok(!volumeExists(), 'refusing to reuse a pre-existing volume: ' + name);
  const projectFilter = 'label=com.docker.compose.project=' + project;
  assert.equal(docker(['ps', '-aq', '--filter', projectFilter]).trim(), '', 'project already has containers');

  function compose(...args) {
    docker([...base, ...args], 'inherit');
  }
  function cleanup(...downOptions) {
    validateConfig();
    compose('down', ...downOptions);
    if (volumeExists()) {
      const labels = JSON.parse(docker(['volume', 'inspect', '--format', '{{json .Labels}}', name]));
      assert.equal(labels?.['com.docker.compose.project'], project, 'refusing to remove a foreign volume');
      assert.equal(labels?.['com.docker.compose.volume'], key, 'unexpected Compose volume label');
      docker(['volume', 'rm', name]); // Docker also refuses removal while any container uses it.
    }
    assert.ok(!volumeExists(), 'volume survived teardown: ' + name);
    console.log('Verified test volume absent after cleanup:', name);
  }
  return { compose, cleanup };
}
