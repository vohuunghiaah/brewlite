import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 'user-1',
    email: 'test@brewlite.com',
    passwordHash: '',
    fullName: 'Test User',
    role: 'CUSTOMER',
    loyaltyPoints: 0,
    createdAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Secret123', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('creates a new user and returns JWT token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce(mockUser);

      const result = await service.register({
        email: 'test@brewlite.com',
        password: 'Password123',
        fullName: 'Test User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@brewlite.com');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('throws ConflictException when email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.register({
          email: 'test@brewlite.com',
          password: 'Password123',
          fullName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns token when credentials are valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.login({
        email: 'test@brewlite.com',
        password: 'Secret123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@brewlite.com');
    });

    it('throws UnauthorizedException when password does not match', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({
          email: 'test@brewlite.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({
          email: 'unknown@brewlite.com',
          password: 'Secret123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
