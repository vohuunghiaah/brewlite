import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController readiness', () => {
  const query = jest.fn();
  let controller: HealthController;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: { query } }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('reads the live database for each successful probe', async () => {
    query.mockResolvedValueOnce([{ result: 1 }]);
    await expect(controller.readiness()).resolves.toEqual({ status: 'ok', database: 'up' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('returns only the public 503 payload after a database error', async () => {
    query.mockRejectedValueOnce(new Error('internal connection detail'));
    await expect(controller.readiness()).rejects.toMatchObject({
      status: 503, response: { status: 'error', database: 'down' },
    });
  });
});
