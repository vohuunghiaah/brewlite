import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { assertTransition } from './order-state-machine';

describe('OrderStateMachine (assertTransition)', () => {
  it('allows valid transitions from PENDING', () => {
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.PAID),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.CANCELLED),
    ).not.toThrow();
  });

  it('rejects invalid transitions from PENDING (e.g. jumping to PREPARING or COMPLETED)', () => {
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.PREPARING),
    ).toThrow(BadRequestException);
    expect(() =>
      assertTransition(OrderStatus.PENDING, OrderStatus.COMPLETED),
    ).toThrow(BadRequestException);
  });

  it('allows retry from PAYMENT_FAILED to PAID', () => {
    expect(() =>
      assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID),
    ).not.toThrow();
  });

  it('allows barista workflow: PAID -> PREPARING -> READY -> COMPLETED', () => {
    expect(() =>
      assertTransition(OrderStatus.PAID, OrderStatus.PREPARING),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.PREPARING, OrderStatus.READY),
    ).not.toThrow();
    expect(() =>
      assertTransition(OrderStatus.READY, OrderStatus.COMPLETED),
    ).not.toThrow();
  });

  it('prohibits any transitions out of COMPLETED terminal state', () => {
    expect(() =>
      assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
    ).toThrow(BadRequestException);
    expect(() =>
      assertTransition(OrderStatus.COMPLETED, OrderStatus.PAID),
    ).toThrow(BadRequestException);
  });

  it('prohibits any transitions out of CANCELLED terminal state', () => {
    expect(() =>
      assertTransition(OrderStatus.CANCELLED, OrderStatus.PREPARING),
    ).toThrow(BadRequestException);
  });
});
