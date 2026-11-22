import { execFileSync } from 'child_process';
import { URL } from 'url';

/**
 * Xác định cấu hình database đích thực tế dựa trên chế độ kết nối (Docker vs Direct PSQL).
 * @param {Record<string, string | undefined>} env
 */
export function getEffectiveDbConfig(env = process.env) {
  const isDirectPsql = env.DB_DIRECT_PSQL === 'true' || env.RUN_PG_TESTS === 'true';

  // Trong chế độ direct psql (CI / local psql client):
  // POSTGRES_DB được ưu tiên trước DB_NAME.
  // Trong chế độ docker container:
  // DB_NAME được ưu tiên (hoặc mặc định 'brewlite').
  const effectiveDbName = isDirectPsql
    ? (env.POSTGRES_DB || env.DB_NAME || 'brewlite').trim()
    : (env.DB_NAME || env.POSTGRES_DB || 'brewlite').trim();

  const user = isDirectPsql
    ? (env.POSTGRES_USER || env.DB_USER || 'brewlite').trim()
    : (env.DB_USER || env.POSTGRES_USER || 'brewlite').trim();

  const host = (env.POSTGRES_HOST || 'localhost').trim();
  const port = (env.POSTGRES_PORT || '5432').trim();
  const password = env.POSTGRES_PASSWORD || 'brewlite_dev_password';
  const container = (env.DB_CONTAINER || 'brewlite-local-db').trim();
  const apiUrl = (env.API_URL || 'http://localhost:3001').trim();
  const webUrl = (env.WEB_URL || 'http://localhost:3000').trim();
  const nodeEnv = (env.NODE_ENV || 'development').toLowerCase().trim();

  return {
    isDirectPsql,
    effectiveDbName,
    user,
    host,
    port,
    password,
    container,
    apiUrl,
    webUrl,
    nodeEnv,
  };
}

/**
 * Kiểm tra tên database có dấu hiệu môi trường production hay không.
 * @param {string} dbName
 */
export function isProductionDatabaseName(dbName) {
  if (!dbName || typeof dbName !== 'string') return false;
  const lower = dbName.toLowerCase().trim();
  return (
    lower === 'production' ||
    lower === 'prod' ||
    lower.includes('production') ||
    lower.includes('prod') ||
    lower.includes('live') ||
    lower.includes('master')
  );
}

/**
 * Kiểm tra API_URL có phải là môi trường production hay không.
 * @param {string} apiUrl
 */
export function isProductionApiUrl(apiUrl) {
  if (!apiUrl || typeof apiUrl !== 'string') return false;
  const lower = apiUrl.toLowerCase().trim();

  // Kiểm tra chuỗi thô
  if (
    lower.includes('brewlite.vn') ||
    lower.includes('brewlite.com') ||
    lower.includes('production') ||
    lower.includes('prod-api') ||
    lower.includes('api.brewlite')
  ) {
    return true;
  }

  try {
    const parsed = new URL(lower);
    const host = parsed.hostname;

    // Các host an toàn dành cho phát triển / thử nghiệm
    const isSafeLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host === 'brewlite-api' ||
      host.endsWith('.local') ||
      host.includes('docker') ||
      host.includes('internal');

    // Nếu host không phải local và có dấu hiệu public hoặc không chứa test/dev -> coi là production
    if (!isSafeLocalHost && !host.includes('test') && !host.includes('dev')) {
      return true;
    }

    return false;
  } catch {
    return lower.includes('prod') || lower.includes('production');
  }
}

/**
 * Kiểm tra tên database có nằm trong danh mục dev/test được nhận diện hay không.
 * @param {string} dbName
 */
export function isRecognizedTestDatabase(dbName) {
  if (!dbName || typeof dbName !== 'string') return false;
  const lower = dbName.toLowerCase().trim();
  return (
    lower === 'brewlite' ||
    lower === 'brewlite_test' ||
    lower === 'brewlite_dev' ||
    lower.endsWith('_test') ||
    lower.endsWith('_dev') ||
    lower.startsWith('test_') ||
    lower.startsWith('dev_') ||
    lower.includes('test') ||
    lower.includes('dev')
  );
}

/**
 * Xác minh tính an toàn của môi trường kiểm thử (DEF-02).
 * Ném lỗi rõ ràng nếu phát hiện bất kỳ dấu hiệu production nào.
 * @param {Record<string, string | undefined>} env
 * @param {string | null} actualLiveDb
 */
export function assertSafeEnvironment(env = process.env, actualLiveDb = null) {
  const config = getEffectiveDbConfig(env);

  // 1. Kiểm tra cấm NODE_ENV production (ALLOW_TEST_SCRIPTS không thể bỏ qua)
  if (config.nodeEnv === 'production' || config.nodeEnv === 'prod') {
    throw new Error(
      `AN TOÀN HỆ THỐNG (DEF-02): Tuyệt đối không được chạy script kiểm thử khi NODE_ENV=${config.nodeEnv}! Biến ALLOW_TEST_SCRIPTS=true không thể bỏ qua điều kiện cấm này.`
    );
  }

  // 2. Kiểm tra API_URL production (ALLOW_TEST_SCRIPTS không thể bỏ qua)
  if (isProductionApiUrl(config.apiUrl)) {
    throw new Error(
      `AN TOÀN HỆ THỐNG (DEF-02): API_URL "${config.apiUrl}" được xác định là môi trường PRODUCTION! Hủy thực thi toàn bộ script để bảo vệ dữ liệu sản phẩm và đơn hàng.`
    );
  }

  // 3. Kiểm tra tên database đích theo cấu hình (ALLOW_TEST_SCRIPTS không thể bỏ qua)
  if (isProductionDatabaseName(config.effectiveDbName)) {
    throw new Error(
      `AN TOÀN HỆ THỐNG (DEF-02): Database đích "${config.effectiveDbName}" (chế độ ${config.isDirectPsql ? 'Direct PSQL' : 'Docker'}) là môi trường PRODUCTION! Tuyệt đối không thực thi thao tác dữ liệu dù có gắn ALLOW_TEST_SCRIPTS=true.`
    );
  }

  // 4. Nếu có tên database thực tế lấy từ SELECT current_database(), kiểm tra tính toàn vẹn
  if (actualLiveDb) {
    if (isProductionDatabaseName(actualLiveDb)) {
      throw new Error(
        `AN TOÀN HỆ THỐNG (DEF-02): Kết nối thực tế đến PostgreSQL đang trỏ vào database PRODUCTION "${actualLiveDb}"! Lập tức hủy bỏ toàn bộ thao tác.`
      );
    }
    if (actualLiveDb.toLowerCase() !== config.effectiveDbName.toLowerCase()) {
      throw new Error(
        `AN TOÀN HỆ THỐNG (DEF-02): Không khớp database! Cấu hình đích là "${config.effectiveDbName}" nhưng SELECT current_database() trả về "${actualLiveDb}".`
      );
    }
  }

  // 5. Kiểm tra phân loại database test/dev: nếu không thuộc danh mục mặc định thì bắt buộc phải có ALLOW_TEST_SCRIPTS=true
  const isSafeDb = isRecognizedTestDatabase(config.effectiveDbName);
  const allowFlag = env.ALLOW_TEST_SCRIPTS === 'true';

  if (!isSafeDb && !allowFlag) {
    throw new Error(
      `AN TOÀN HỆ THỐNG (DEF-02): Database "${config.effectiveDbName}" không thuộc danh mục dev/test mặc định (brewlite, brewlite_test, *_test, *_dev). Vui lòng đặt ALLOW_TEST_SCRIPTS=true nếu đây là CSDL thử nghiệm hợp lệ.`
    );
  }

  return config;
}

/**
 * Thực thi câu lệnh SQL trên PostgreSQL bằng execFileSync, không truyền mật khẩu qua shell string.
 * @param {string} sql
 * @param {Record<string, string | undefined>} env
 */
export function queryDb(sql, env = process.env) {
  const config = getEffectiveDbConfig(env);
  const singleLine = sql.replace(/\r?\n/g, ' ');

  if (config.isDirectPsql) {
    const args = [
      '-h', config.host,
      '-p', String(config.port),
      '-U', config.user,
      '-d', config.effectiveDbName,
      '-t',
      '-A',
      '-c', singleLine,
    ];
    const runEnv = { ...process.env, ...env, PGPASSWORD: config.password };
    const stdout = execFileSync('psql', args, { env: runEnv, encoding: 'utf8' });
    return stdout.trim();
  } else {
    // Docker exec: truyền PGPASSWORD qua tùy chọn -e của docker exec
    const args = [
      'exec',
      '-e', 'PGPASSWORD',
      config.container,
      'psql',
      '-U', config.user,
      '-d', config.effectiveDbName,
      '-t',
      '-A',
      '-c', singleLine,
    ];
    const stdout = execFileSync('docker', args, {
      env: { ...process.env, ...env, PGPASSWORD: config.password },
      encoding: 'utf8',
    });
    return stdout.trim();
  }
}

/**
 * Xác thực thực tế database đang kết nối trước mọi thao tác thay đổi dữ liệu hoặc request API.
 * Thực thi `SELECT current_database()` và đối chiếu tên database.
 * @param {Record<string, string | undefined>} env
 */
export function verifyLiveDatabase(env = process.env) {
  // 1. Kiểm tra cấu hình tĩnh trước
  assertSafeEnvironment(env);

  // 2. Thực thi SELECT current_database()
  const liveDbName = queryDb('SELECT current_database();', env);

  // 3. Kiểm tra đối chiếu với database thực tế
  assertSafeEnvironment(env, liveDbName);

  return liveDbName;
}
