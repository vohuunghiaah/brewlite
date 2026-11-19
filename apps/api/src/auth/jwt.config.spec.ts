import { jwtConfig } from './jwt.config';

describe('JWT configuration', () => {
  const generatedTestSecret = 'local-jwt-configuration-test-key';

  afterEach(() => jest.restoreAllMocks());

  it.each([undefined, 'too-short', 'replace-with-a-long-random-secret'])(
    'rejects an unset, short, or public sample signing secret',
    (secret) => {
      const env = { ...process.env };
      delete env.JWT_SECRET;
      if (secret !== undefined) {
        env.JWT_SECRET = secret;
      }
      jest.replaceProperty(process, 'env', env);
      expect(jwtConfig).toThrow(/JWT_SECRET/);
    },
  );

  it.each(['0', '-1', 'tomorrow', '2147483648'])(
    'rejects invalid or out-of-range token duration %s',
    (duration) => {
      jest.replaceProperty(process, 'env', {
        ...process.env,
        JWT_SECRET: generatedTestSecret,
        JWT_EXPIRES_IN: duration,
      });
      expect(jwtConfig).toThrow(/JWT_EXPIRES_IN/);
    },
  );
});
