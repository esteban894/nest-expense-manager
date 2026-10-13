import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FindTransactionsQueryDto } from './dto/find-transactions-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { userActiveInterface } from 'src/common/interfaces/user-active.interface';
import { Role } from 'src/common/enums/role.enum';
import { TypeAmount } from './models/typeAmount.model';

export const signedAmount = (amount: number, type: TypeAmount) =>
  type === TypeAmount.INCOME ? Math.abs(amount) : -Math.abs(amount);

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    user: userActiveInterface,
  ) {
    return await this.transactionRepository.save({
      ...createTransactionDto,
      amount: signedAmount(
        createTransactionDto.amount,
        createTransactionDto.typeAmount,
      ),
      userEmail: user.email,
    });
  }

  private scoped(user: userActiveInterface) {
    const qb = this.transactionRepository.createQueryBuilder('t');
    if (user.role !== Role.ADMIN) qb.where('t.userEmail = :email', { email: user.email });
    return qb;
  }

  async findAll(user: userActiveInterface, q: FindTransactionsQueryDto) {
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    if (from && to && from.getTime() >= to.getTime()) {
      throw new BadRequestException('La fecha "desde" no puede ser posterior a "hasta"');
    }
    const qb = this.scoped(user);
    if (q.type) qb.andWhere('t.typeAmount = :type', { type: q.type });
    if (q.search) {
      const escaped = q.search.replace(/[\\%_]/g, (c) => `\\${c}`);
      qb.andWhere("t.description LIKE :search ESCAPE '\\\\'", { search: `%${escaped}%` });
    }
    if (from) qb.andWhere('t.createdAt >= :from', { from });
    if (to) qb.andWhere('t.createdAt < :to', { to });
    return qb.orderBy('t.createdAt', 'DESC').addOrderBy('t.id', 'DESC').getMany();
  }

  async summary(user: userActiveInterface) {
    const rows = await this.scoped(user)
      .select('t.typeAmount', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.typeAmount')
      .getRawMany<{ type: TypeAmount; total: string; count: string }>();
    const by = (t: TypeAmount) => rows.find((r) => r.type === t);
    const total = (t: TypeAmount) => Math.abs(Number(by(t)?.total ?? 0));
    const count = (t: TypeAmount) => Number(by(t)?.count ?? 0);
    const income = total(TypeAmount.INCOME);
    const necessary = total(TypeAmount.EXPENSE_NECESSARY);
    const unnecessary = total(TypeAmount.EXPENSE_UNNECESSARY);
    return {
      balance: income - necessary - unnecessary, income,
      expense: necessary + unnecessary, necessary, unnecessary,
      counts: {
        income: count(TypeAmount.INCOME),
        expense_necessary: count(TypeAmount.EXPENSE_NECESSARY),
        expense_unnecessary: count(TypeAmount.EXPENSE_UNNECESSARY),
      },
    };
  }

  private ownerWhere(id: number, user: userActiveInterface) {
    return user.role === Role.ADMIN ? { id } : { id, userEmail: user.email };
  }

  async findOne(id: number, user: userActiveInterface, withDeleted = false) {
    const transaction = await this.transactionRepository.findOne({
      where: this.ownerWhere(id, user),
      ...(withDeleted && { withDeleted }),
    });
    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }
    return transaction;
  }

  async update(
    id: number,
    updateTransactionDto: UpdateTransactionDto,
    user: userActiveInterface,
  ) {
    const existing = await this.findOne(id, user);
    const patch: Partial<Transaction> = { ...updateTransactionDto };
    if (
      updateTransactionDto.amount !== undefined ||
      updateTransactionDto.typeAmount !== undefined
    ) {
      const type = (updateTransactionDto.typeAmount ??
        existing.typeAmount) as TypeAmount;
      const amount = updateTransactionDto.amount ?? Math.abs(existing.amount);
      patch.amount = signedAmount(amount, type);
    }
    return await this.transactionRepository.update(id, patch);
  }

  async remove(id: number, user: userActiveInterface) {
    await this.findOne(id, user);
    return await this.transactionRepository.softDelete({ id });
  }

  async restore(id: number, user: userActiveInterface) {
    await this.findOne(id, user, true);
    await this.transactionRepository.restore({ id });
    return this.findOne(id, user);
  }
}
