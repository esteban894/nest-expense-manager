import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { TypeAmount } from './models/typeAmount.model';

const user = { email: 'ana@test.com', role: 'user' };

export function createQbMock(result: unknown[] = []) {
  const qb: any = {};
  ['where', 'andWhere', 'orderBy', 'select', 'addSelect', 'groupBy'].forEach(
    (m) => (qb[m] = jest.fn().mockReturnValue(qb)),
  );
  qb.getMany = jest.fn().mockResolvedValue(result);
  qb.getRawMany = jest.fn().mockResolvedValue(result);
  return qb;
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repo: Record<string, jest.Mock>;
  let qb: any;

  beforeEach(async () => {
    qb = createQbMock();
    repo = {
      save: jest.fn((x) => Promise.resolve({ id: 1, ...x })),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };
    const mod = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: repo },
      ],
    }).compile();
    service = mod.get(TransactionsService);
  });

  describe('create', () => {
    it('guarda ingresos en positivo', async () => {
      await service.create({ amount: 1050, description: 'Sueldo', typeAmount: TypeAmount.INCOME }, user);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ amount: 1050, userEmail: user.email }));
    });
    it('guarda gastos en negativo aunque llegue positivo', async () => {
      await service.create({ amount: 1050, description: 'Luz', typeAmount: TypeAmount.EXPENSE_NECESSARY }, user);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ amount: -1050 }));
    });
  });
});
