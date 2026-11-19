import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
@Index('IDX_orders_userId', ['userId'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId', foreignKeyConstraintName: 'FK_orders_userId_users' })
  user: User | null;

  @Column({ type: 'varchar', length: 100 })
  customerName: string;

  @Column({ type: 'varchar', length: 20 })
  customerPhone: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  totalAmount: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items: OrderItem[];
}
