import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

export enum PaymentMethod {
  MOMO = 'MOMO',
  VIETQR = 'VIETQR',
  CARD = 'CARD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
@Index('IDX_payments_orderId', ['orderId'])
@Index('IDX_payments_userId', ['userId'])
@Index('IDX_payments_idempotencyKey', ['idempotencyKey'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  orderId: number;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId', foreignKeyConstraintName: 'FK_payments_orderId' })
  order: Order;

  @Column({ type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_payments_userId' })
  user: User;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  amount: string;

  @Column({
    type: 'varchar',
    length: 30,
  })
  method: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 30,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'varchar',
    length: 128,
    unique: true,
  })
  idempotencyKey: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  transactionId: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  merchantReference: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  buzzerCode: string | null;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  refundKey: string | null;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  payloadHash: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
