import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { compare, getRounds } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { QueryFailedError } from 'typeorm';
import { User, UserRole, USER_EMAIL_UNIQUE } from '../users/entities/user.entity';
import { AuthModule } from './auth.module';

const TEST_SECRET = 'local-auth-endpoint-verification-secret';
const credentials = {
  email: 'customer@example.com',
  password: 'a safe password',
};

describe('Auth endpoints', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const accounts = new Map<string, User>();
  const users = {
    create: (details: Pick<User, 'email' | 'passwordHash'>) => details,
    save: (details: Pick<User, 'email' | 'passwordHash'>) => {
      if (accounts.has(details.email)) {
        throw new QueryFailedError(
          'INSERT INTO users',
          [],
          Object.assign(new Error('Duplicate email'), {
            code: '23505',
            constraint: USER_EMAIL_UNIQUE,
          }),
        );
      }
      const account = {
        ...details,
        id: accounts.size + 1,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      };
      accounts.set(details.email, account);
      return account;
    },
    findOne: ({ where }: { where: { email: string } }) =>
      accounts.get(where.email),
    findOneBy: ({ id }: { id: number }) =>
      Array.from(accounts.values()).find((user) => user.id === id),
  };

  beforeAll(async () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      JWT_SECRET: TEST_SECRET,
      JWT_EXPIRES_IN: '900',
    });
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(getRepositoryToken(User))
      .useValue(users)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
  });

  beforeEach(() => accounts.clear());

  it('normalizes email, persists a bcrypt hash, and returns only public user fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...credentials, email: ' Customer@EXAMPLE.COM ' })
      .expect(201);

    const account = accounts.get(credentials.email);
    expect(account).toBeDefined();
    expect(getRounds(account!.passwordHash)).toBe(10);
    await expect(
      compare(credentials.password, account!.passwordHash),
    ).resolves.toBe(true);
    expect(response.body).toEqual({
      id: account!.id,
      email: account!.email,
      role: UserRole.CUSTOMER,
      createdAt: account!.createdAt.toISOString(),
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);
    expect(accounts.size).toBe(1);
  });

  it.each([
    { ...credentials, email: 'invalid-email' },
    { ...credentials, email: '\ud800@example.com' },
    { ...credentials, password: 'valid\ud800' },
    { ...credentials, password: '12345' },
    { ...credentials, password: '😀'.repeat(19) },
    { ...credentials, password: 123456 },
    { ...credentials, role: 'ADMIN' },
    { ...credentials, role: 'STAFF' },
  ])('rejects invalid or extra credentials fields', async (body) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(body)
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(body)
      .expect(400);
    expect(accounts.size).toBe(0);
  });

  it('issues an expiring Bearer token and authenticates the stored account', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...credentials, email: 'CUSTOMER@example.com' })
      .expect('Cache-Control', 'no-store')
      .expect(200);
    const { tokenType, accessToken, user } = body as {
      tokenType: string;
      accessToken: string;
      user: unknown;
    };
    expect(tokenType).toBe('Bearer');
    expect(user).toEqual(registration.body);
    const { sub, iat, exp } = jwt.verify<{
      sub: string;
      iat: number;
      exp: number;
    }>(accessToken);
    expect(sub).toBe('1');
    expect(exp - iat).toBe(900);

    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(accessToken, { type: 'bearer' })
      .expect(200, registration.body);
  });

  it('returns the same 401 response for incorrect passwords and unknown accounts', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...credentials, password: 'incorrect password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...credentials, email: 'missing@example.com' })
      .expect(401, wrongPassword.body);
  });

  it('rejects missing, tampered, expired, non-HS256, and unbound JWTs', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const withoutExpiration = new JwtService({ secret: TEST_SECRET }).sign({
      sub: '1',
    });
    const wrongSignature = new JwtService({
      secret: 'another-test-signing-key',
    }).sign({
      sub: '1',
      exp: Math.floor(Date.now() / 1000) + 60,
    });

    for (const token of [
      'invalid.token.value',
      wrongSignature,
      withoutExpiration,
      jwt.sign({ sub: '1' }, { expiresIn: -1 }),
      jwt.sign({ sub: '1' }, { algorithm: 'HS384' }),
      jwt.sign({ sub: '2' }),
      jwt.sign({ sub: '2147483648' }),
    ]) {
      await request(app.getHttpServer())
        .get('/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
  });
});
