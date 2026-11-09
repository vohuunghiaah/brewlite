import { resolveCorsOrigin } from './cors.util';

describe('CORS Utility Security Specification', () => {
  describe('In Development / Test Environment (non-production)', () => {
    it('should default to true when CORS_ORIGIN is undefined', () => {
      expect(resolveCorsOrigin('development', undefined)).toBe(true);
      expect(resolveCorsOrigin('test', undefined)).toBe(true);
      expect(resolveCorsOrigin(undefined, undefined)).toBe(true);
    });

    it('should parse comma-separated origins when provided', () => {
      const result = resolveCorsOrigin(
        'development',
        'http://localhost:3000, http://localhost:3001',
      );
      expect(result).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
    });
  });

  describe('In Production Environment (NODE_ENV=production)', () => {
    it('should throw Error if CORS_ORIGIN is missing or empty', () => {
      expect(() => resolveCorsOrigin('production', undefined)).toThrow(
        /SECURITY VIOLATION/,
      );
      expect(() => resolveCorsOrigin('production', '')).toThrow(
        /SECURITY VIOLATION/,
      );
      expect(() => resolveCorsOrigin('production', '   ')).toThrow(
        /SECURITY VIOLATION/,
      );
    });

    it('should throw Error if CORS_ORIGIN contains wildcard (*)', () => {
      expect(() => resolveCorsOrigin('production', '*')).toThrow(
        /Wildcard \(\*\) CORS origin is strictly forbidden/,
      );
      expect(() =>
        resolveCorsOrigin('production', 'https://brewlite.com, *'),
      ).toThrow(/Wildcard \(\*\) CORS origin is strictly forbidden/);
    });

    it('should throw Error if any origin is insecure HTTP (non-localhost)', () => {
      expect(() =>
        resolveCorsOrigin('production', 'http://insecure-domain.com'),
      ).toThrow(/Production CORS origin must use HTTPS/);
    });

    it('should accept valid HTTPS production domains', () => {
      const result = resolveCorsOrigin(
        'production',
        'https://brewlite.com, https://app.brewlite.com',
      );
      expect(result).toEqual([
        'https://brewlite.com',
        'https://app.brewlite.com',
      ]);
    });

    it('should allow http://localhost for containerized internal smoke testing in production mode', () => {
      const result = resolveCorsOrigin(
        'production',
        'http://localhost:3000, https://brewlite.com',
      );
      expect(result).toEqual(['http://localhost:3000', 'https://brewlite.com']);
    });
  });
});
