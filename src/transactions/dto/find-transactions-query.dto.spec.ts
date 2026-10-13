import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindTransactionsQueryDto } from './find-transactions-query.dto';

const errorsFor = async (plain: Record<string, unknown>) =>
  (await validate(plainToInstance(FindTransactionsQueryDto, plain))).map((e) => e.property);

describe('FindTransactionsQueryDto', () => {
  it('acepta from/to como instantes ISO 8601', async () => {
    expect(await errorsFor({ from: '2026-10-01T03:00:00.000Z', to: '2026-10-14T03:00:00.000Z' })).toEqual([]);
  });
  it('rechaza fechas inválidas o texto libre', async () => {
    expect(await errorsFor({ from: '2026-02-30T03:00:00.000Z', to: 'ayer' })).toEqual(['from', 'to']);
  });
});
