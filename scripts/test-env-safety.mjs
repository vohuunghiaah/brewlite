import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEffectiveDbConfig,
  isProductionDatabaseName,
  isProductionApiUrl,
  isRecognizedTestDatabase,
  assertSafeEnvironment,
} from './env-safety.mjs';

test('DEF-02: Xác định đúng database đích theo chế độ kết nối (Requirement 1)', () => {
  // Chế độ Docker container: DB_NAME được ưu tiên
  const dockerConfig = getEffectiveDbConfig({
    DB_DIRECT_PSQL: 'false',
    DB_NAME: 'brewlite_docker_test',
    POSTGRES_DB: 'brewlite_ignored',
  });
  assert.strictEqual(dockerConfig.isDirectPsql, false);
  assert.strictEqual(dockerConfig.effectiveDbName, 'brewlite_docker_test');

  // Chế độ Direct PSQL: POSTGRES_DB được ưu tiên
  const directConfig = getEffectiveDbConfig({
    DB_DIRECT_PSQL: 'true',
    DB_NAME: 'brewlite_fallback',
    POSTGRES_DB: 'brewlite_ci_test',
  });
  assert.strictEqual(directConfig.isDirectPsql, true);
  assert.strictEqual(directConfig.effectiveDbName, 'brewlite_ci_test');

  // Chế độ RUN_PG_TESTS=true cũng kích hoạt Direct PSQL
  const runPgConfig = getEffectiveDbConfig({
    RUN_PG_TESTS: 'true',
    POSTGRES_DB: 'brewlite_pg_run',
  });
  assert.strictEqual(runPgConfig.isDirectPsql, true);
  assert.strictEqual(runPgConfig.effectiveDbName, 'brewlite_pg_run');
});

test('DEF-02: Nhận diện chính xác tên database production (Requirement 4)', () => {
  assert.strictEqual(isProductionDatabaseName('production'), true);
  assert.strictEqual(isProductionDatabaseName('prod'), true);
  assert.strictEqual(isProductionDatabaseName('brewlite_production'), true);
  assert.strictEqual(isProductionDatabaseName('brewlite_prod'), true);
  assert.strictEqual(isProductionDatabaseName('live_db'), true);

  assert.strictEqual(isProductionDatabaseName('brewlite'), false);
  assert.strictEqual(isProductionDatabaseName('brewlite_test'), false);
  assert.strictEqual(isProductionDatabaseName('brewlite_dev'), false);
});

test('DEF-02: Nhận diện chính xác API_URL production (Requirement 6)', () => {
  assert.strictEqual(isProductionApiUrl('https://api.brewlite.vn'), true);
  assert.strictEqual(isProductionApiUrl('https://brewlite.vn/api'), true);
  assert.strictEqual(isProductionApiUrl('https://brewlite.com/api'), true);
  assert.strictEqual(isProductionApiUrl('http://prod-api:3001'), true);
  assert.strictEqual(isProductionApiUrl('https://production-server.com/api'), true);

  assert.strictEqual(isProductionApiUrl('http://localhost:3001'), false);
  assert.strictEqual(isProductionApiUrl('http://127.0.0.1:3001'), false);
  assert.strictEqual(isProductionApiUrl('http://brewlite-api:3001'), false);
  assert.strictEqual(isProductionApiUrl('http://test-server.local:3001'), false);
});

test('DEF-02 REQUIREMENT 8: DB_NAME an toàn nhưng POSTGRES_DB production trong Direct PSQL sẽ bị chặn', () => {
  const env = {
    DB_DIRECT_PSQL: 'true',
    DB_NAME: 'brewlite_test', // An toàn
    POSTGRES_DB: 'brewlite_production', // PRODUCTION!
    ALLOW_TEST_SCRIPTS: 'true',
  };

  assert.throws(
    () => {
      assertSafeEnvironment(env);
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('DEF-02'));
      assert(err.message.includes('brewlite_production'));
      assert(err.message.includes('PRODUCTION'));
      return true;
    },
    'Bắt buộc ném lỗi khi POSTGRES_DB là production dù DB_NAME an toàn',
  );
});

test('DEF-02 REQUIREMENT 9: Cấu hình API_URL production và database test không khớp sẽ bị chặn', () => {
  const env = {
    API_URL: 'https://api.brewlite.vn', // Production API!
    DB_NAME: 'brewlite_test', // Safe test database
    ALLOW_TEST_SCRIPTS: 'true',
  };

  assert.throws(
    () => {
      assertSafeEnvironment(env);
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('DEF-02'));
      assert(err.message.includes('API_URL'));
      assert(err.message.includes('PRODUCTION'));
      return true;
    },
    'Bắt buộc ném lỗi khi API_URL là production dù DB_NAME là test',
  );
});

test('DEF-02 REQUIREMENT 5: ALLOW_TEST_SCRIPTS=true không thể bỏ qua cấm NODE_ENV production', () => {
  const env = {
    NODE_ENV: 'production',
    DB_NAME: 'brewlite_test',
    ALLOW_TEST_SCRIPTS: 'true',
  };

  assert.throws(
    () => {
      assertSafeEnvironment(env);
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('NODE_ENV=production'));
      return true;
    },
  );
});

test('DEF-02 REQUIREMENT 5: ALLOW_TEST_SCRIPTS=true không thể bỏ qua cấm DB production', () => {
  const env = {
    DB_NAME: 'brewlite_prod',
    ALLOW_TEST_SCRIPTS: 'true',
  };

  assert.throws(
    () => {
      assertSafeEnvironment(env);
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('PRODUCTION'));
      return true;
    },
  );
});

test('DEF-02 REQUIREMENT 3: Kiểm tra khớp và an toàn của SELECT current_database() thực tế', () => {
  const env = {
    DB_NAME: 'brewlite_test',
    ALLOW_TEST_SCRIPTS: 'true',
  };

  // Case 1: Tên DB thực tế không khớp cấu hình đích
  assert.throws(
    () => {
      assertSafeEnvironment(env, 'other_test_db');
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('Không khớp database'));
      return true;
    },
  );

  // Case 2: Tên DB thực tế là production
  assert.throws(
    () => {
      assertSafeEnvironment(env, 'brewlite_production');
    },
    (err) => {
      assert(err instanceof Error);
      assert(err.message.includes('PRODUCTION'));
      return true;
    },
  );

  // Case 3: Tên DB thực tế khớp và an toàn
  assert.doesNotThrow(() => {
    assertSafeEnvironment(env, 'brewlite_test');
  });
});

test('DEF-02: Cấu hình chuẩn mặc định (brewlite + localhost API) chạy thành công', () => {
  const env = {
    NODE_ENV: 'development',
    DB_NAME: 'brewlite',
    API_URL: 'http://localhost:3001',
    WEB_URL: 'http://localhost:3000',
  };

  assert.doesNotThrow(() => {
    assertSafeEnvironment(env, 'brewlite');
  });
});
