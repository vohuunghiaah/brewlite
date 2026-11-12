
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

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
