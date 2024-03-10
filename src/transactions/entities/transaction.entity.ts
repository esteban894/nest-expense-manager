import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { TypeAmount } from '../../transactions/models/typeAmount.model';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Transaction {
  @Column({ primary: true, generated: true })
  id: number;

  @Column()
  amount: number;

  @Column()
  description: string;

  @Column({ type: 'enum', default: TypeAmount.INCOME, enum: TypeAmount })
  typeAmount: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userEmail', referencedColumnName: 'email' })
  user: User;

  @Column()
  userEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
