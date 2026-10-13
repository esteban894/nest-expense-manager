import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
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

  async findAll(user: userActiveInterface) {
    if (user.role === Role.ADMIN) {
      return await this.transactionRepository.find();
    }

    console.log(user.email);
    return await this.transactionRepository.find({
      where: { userEmail: user.email },
    });
  }

  async findOne(id: number) {
    const transaction = await this.transactionRepository.findOneBy({ id });
    if (!transaction) {
      throw new NotFoundException('transaction not found');
    }
    return transaction;
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto) {
    const existing = await this.findOne(id);
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

  async remove(id: number) {
    await this.findOne(id);
    return await this.transactionRepository.softDelete({ id });
  }
}
