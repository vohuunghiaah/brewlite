import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

export enum ProductSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  productName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductSize.SMALL,
  })
  size: ProductSize;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
  })
  toppings: string[];

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  note?: string | null;

  @Column({
    type: 'integer',
  })
  quantity: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  unitPrice: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  subtotal: string;

  @ManyToOne(
    () => Order,
    (order) => order.items,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(
    () => Product,
    {
      onDelete: 'RESTRICT',
    },
  )
  @JoinColumn({ name: 'productId' })
  product: Product;
}
