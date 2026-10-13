import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { TypeAmount } from './models/typeAmount.model';

const user = { email: 'ana@test.com', role: 'user' };

export function createQbMock(result: unknown[] = []) {
  const qb: any = {};
  ['where', 'andWhere', 'orderBy', 'addOrderBy', 'select', 'addSelect', 'groupBy'].forEach(
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

  describe('findAll', () => {
    it('filtra por dueño y ordena por fecha', async () => {
      await service.findAll(user, {});
      expect(qb.where).toHaveBeenCalledWith('t.userEmail = :email', { email: user.email });
      expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'DESC');
    });
    it('admin no se limita por email', async () => {
      await service.findAll({ ...user, role: 'admin' }, {});
      expect(qb.where).not.toHaveBeenCalled();
    });
    it('aplica tipo', async () => {
      await service.findAll(user, { type: TypeAmount.INCOME });
      expect(qb.andWhere).toHaveBeenCalledWith('t.typeAmount = :type', { type: 'income' });
    });
    it('escapa comodines en la búsqueda', async () => {
      await service.findAll(user, { search: '50%_off' });
      expect(qb.andWhere).toHaveBeenCalledWith("t.description LIKE :search ESCAPE '\\\\'", { search: '%50\\%\\_off%' });
    });
    it('to es inclusivo hasta fin del día', async () => {
      await service.findAll(user, { from: '2026-10-01', to: '2026-10-13' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt >= :from', { from: '2026-10-01 00:00:00' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt < DATE_ADD(:to, INTERVAL 1 DAY)', { to: '2026-10-13' });
    });
    it('rechaza from > to', async () => {
      await expect(service.findAll(user, { from: '2026-10-13', to: '2026-10-01' })).rejects.toThrow(BadRequestException);
    });
  });
});
