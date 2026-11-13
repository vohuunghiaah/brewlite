/**
 * Resolves and validates CORS origin configuration for BrewLite API.
 *
 * In production (`NODE_ENV === 'production'`):
 * - Blocks undefined, null, or empty CORS_ORIGIN.
 * - Blocks wildcard '*' (security violation when credentials: true).
 * - Blocks non-HTTPS origins (except http://localhost for local test harnesses).
 * - Returns an array of validated allowed origin strings.
 *
 * In non-production (development / test):
 * - If CORS_ORIGIN is specified, splits and returns allowed origins.
 * - If not specified, safely defaults to true (reflect client origin for local dev).
 */
export function resolveCorsOrigin(
  nodeEnv: string | undefined,
  corsOriginEnv: string | undefined,
): boolean | string[] {
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    if (!corsOriginEnv || !corsOriginEnv.trim()) {
      throw new Error(
        '[SECURITY VIOLATION] CORS_ORIGIN must be explicitly configured in production. Unrestricted or omitted CORS is blocked.',
      );
    }

    const origins = corsOriginEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    if (origins.includes('*')) {
      throw new Error(
        '[SECURITY VIOLATION] Wildcard (*) CORS origin is strictly forbidden in production with credentials. Specify exact trusted HTTPS origins.',
      );
    }

    for (const origin of origins) {
      if (
        !origin.startsWith('https://') &&
        !origin.startsWith('http://localhost')
      ) {
        throw new Error(
          `[SECURITY VIOLATION] Production CORS origin must use HTTPS: "${origin}". Insecure origins are blocked.`,
        );
      }
    }

    return origins;
  }

  // Development & Test environments
  if (corsOriginEnv && corsOriginEnv.trim() !== '') {
    return corsOriginEnv
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  return true;
}
