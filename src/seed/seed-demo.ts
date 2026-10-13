import { BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from 'src/app.module';
import { AuthService } from 'src/auth/auth.service';
import { TransactionsService } from 'src/transactions/transactions.service';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { TypeAmount } from 'src/transactions/models/typeAmount.model';
import { Role } from 'src/common/enums/role.enum';

const DEMO = {
  name: 'Ana Pérez',
  email: 'demo@cuentasclaras.app',
  password: 'portfolio2026',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Montos en centavos (positivos; el signo lo deriva el servicio).
// daysAgo: antigüedad relativa a la ejecución, para que los filtros por fecha muestren algo útil.
const SAMPLES: { description: string; typeAmount: TypeAmount; amount: number; daysAgo: number }[] = [
  { description: 'Sueldo octubre', typeAmount: TypeAmount.INCOME, amount: 85000000, daysAgo: 12 },
  { description: 'Alquiler', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 32000000, daysAgo: 11 },
  { description: 'Proyecto freelance: landing page', typeAmount: TypeAmount.INCOME, amount: 18000000, daysAgo: 6 },
  { description: 'Supermercado semanal', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 9650000, daysAgo: 3 },
  { description: 'Zapatillas que estaban en oferta', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 9400000, daysAgo: 5 },
  { description: 'Factura de luz', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 2780000, daysAgo: 8 },
  { description: 'Delivery del viernes', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 1890000, daysAgo: 1 },
  { description: 'Carga de nafta', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 3500000, daysAgo: 2 },
  { description: 'Suscripciones de streaming', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 1240000, daysAgo: 9 },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    try {
      await app.get(AuthService).register(DEMO);
      console.log(`Usuario creado: ${DEMO.email}`);
    } catch (e) {
      if (!(e instanceof BadRequestException)) throw e;
      console.log(`Usuario ya existía: ${DEMO.email}`);
    }

    const repo = app.get<Repository<Transaction>>(getRepositoryToken(Transaction), { strict: false });
    await repo.delete({ userEmail: DEMO.email }); // hard delete (incluye soft-deleted)

    const transactions = app.get(TransactionsService);
    const user = { email: DEMO.email, role: Role.USER };
    const now = Date.now();
    for (const { daysAgo, ...s } of SAMPLES) {
      const { id } = await transactions.create(s, user);
      // createdAt lo pone MySQL al insertar; se retrocede para repartir la demo en ~2 semanas.
      await repo.update(id, { createdAt: new Date(now - daysAgo * DAY_MS) });
    }
    console.log(`${SAMPLES.length} transacciones de ejemplo creadas.`);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
