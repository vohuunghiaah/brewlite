import { registerAs } from '@nestjs/config';

const durationUnits = new Map([
  ['s', 1],
  ['m', 60],
  ['h', 60 * 60],
  ['d', 24 * 60 * 60],
]);

export const jwtConfig = registerAs('authJwt', () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (
    !secret ||
    Buffer.byteLength(secret, 'utf8') < 32 ||
    secret === 'replace-with-a-long-random-secret'
  ) {
    throw new Error(
      'Set JWT_SECRET to a generated secret of at least 32 bytes.',
    );
  }

  const expiration = process.env.JWT_EXPIRES_IN ?? '1d';
  const match = /^([1-9]\d*)([smhd]?)$/.exec(expiration);
  const expiresIn = match
    ? Number(match[1]) * (durationUnits.get(match[2]) ?? 1)
    : NaN;

  if (!Number.isSafeInteger(expiresIn) || expiresIn > 2_147_483_647) {
    throw new Error(
      'Set JWT_EXPIRES_IN to a positive duration, such as 3600 or 1d.',
    );
  }

  return { secret, expiresIn };
});
