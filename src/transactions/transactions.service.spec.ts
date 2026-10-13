import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  describe('summary', () => {
    it('summary agrega por tipo y castea strings de MySQL', async () => {
      qb.getRawMany.mockResolvedValue([
        { type: 'income', total: '103000000', count: '2' },
        { type: 'expense_necessary', total: '-47930000', count: '4' },
        { type: 'expense_unnecessary', total: '-12530000', count: '3' },
      ]);
      await expect(service.summary(user)).resolves.toEqual({
        balance: 42540000, income: 103000000, expense: 60460000,
        necessary: 47930000, unnecessary: 12530000,
        counts: { income: 2, expense_necessary: 4, expense_unnecessary: 3 },
      });
    });
    it('summary vacío devuelve ceros', async () => {
      await expect(service.summary(user)).resolves.toMatchObject({ balance: 0, counts: { income: 0 } });
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
    it('compara instantes ISO: from inclusivo, to exclusivo', async () => {
      const from = '2026-10-01T03:00:00.000Z';
      const to = '2026-10-14T03:00:00.000Z';
      await service.findAll(user, { from, to });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt >= :from', { from: new Date(from) });
      expect(qb.andWhere).toHaveBeenCalledWith('t.createdAt < :to', { to: new Date(to) });
    });
    it('rechaza from > to', async () => {
      await expect(
        service.findAll(user, { from: '2026-10-14T03:00:00.000Z', to: '2026-10-01T03:00:00.000Z' }),
      ).rejects.toThrow('La fecha "desde" no puede ser posterior a "hasta"');
    });
    it('rechaza from == to (rango vacío, to es exclusivo)', async () => {
      const t = '2026-10-13T03:00:00.000Z';
      await expect(service.findAll(user, { from: t, to: t })).rejects.toThrow(BadRequestException);
    });
    it('compara por instante, no por texto (offsets distintos)', async () => {
      // 2026-10-13T01:00:00-03:00 == 04:00Z, posterior a 03:00Z aunque el texto ordene antes
      await expect(
        service.findAll(user, { from: '2026-10-13T01:00:00-03:00', to: '2026-10-13T03:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ownership y restore', () => {
    it('remove de transacción ajena → 404 y no borra', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(7, user)).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 7, userEmail: user.email } });
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
    it('restore busca incluyendo eliminadas y restaura', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 7, deletedAt: new Date() })
        .mockResolvedValueOnce({ id: 7, deletedAt: null });
      await expect(service.restore(7, user)).resolves.toEqual({ id: 7, deletedAt: null });
      expect(repo.findOne).toHaveBeenNthCalledWith(1, { where: { id: 7, userEmail: user.email }, withDeleted: true });
      expect(repo.restore).toHaveBeenCalledWith({ id: 7 });
    });
  });
});
