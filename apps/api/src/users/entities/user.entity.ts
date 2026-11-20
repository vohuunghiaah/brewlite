import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export const USER_EMAIL_UNIQUE = 'UQ_users_email';

@Entity('users')
@Unique(USER_EMAIL_UNIQUE, ['email'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 60, select: false })
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
