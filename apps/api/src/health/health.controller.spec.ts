import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return ok when database is connected', async () => {
    const health = await controller.getHealth();
    expect(health.status).toBe('ok');
    expect(health.database).toBe('connected');
    expect(health.service).toBe('brewlite-api');
    expect(health.version).toBeDefined();
    expect(health.commit).toBeDefined();
  });

  it('should return degraded when database query fails', async () => {
    jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('DB Down'));
    const health = await controller.getHealth();
    expect(health.status).toBe('degraded');
    expect(health.database).toBe('error');
  });
});
