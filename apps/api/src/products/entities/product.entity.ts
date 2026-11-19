
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price!: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  imageUrl!: string | null;

  @Column({
    type: 'boolean',
    default: true,
  })
  isAvailable!: boolean;

  @Column({
    type: 'int',
    default: 50,
  })
  stock!: number;

  @VersionColumn({
    default: 1,
  })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
