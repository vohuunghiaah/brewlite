import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

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