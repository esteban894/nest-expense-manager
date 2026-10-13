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

// Montos en centavos (positivos; el signo lo deriva el servicio).
const SAMPLES: { description: string; typeAmount: TypeAmount; amount: number }[] = [
  { description: 'Sueldo octubre', typeAmount: TypeAmount.INCOME, amount: 85000000 },
  { description: 'Alquiler', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 32000000 },
  { description: 'Proyecto freelance: landing page', typeAmount: TypeAmount.INCOME, amount: 18000000 },
  { description: 'Supermercado semanal', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 9650000 },
  { description: 'Zapatillas que estaban en oferta', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 9400000 },
  { description: 'Factura de luz', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 2780000 },
  { description: 'Delivery del viernes', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 1890000 },
  { description: 'Carga de nafta', typeAmount: TypeAmount.EXPENSE_NECESSARY, amount: 3500000 },
  { description: 'Suscripciones de streaming', typeAmount: TypeAmount.EXPENSE_UNNECESSARY, amount: 1240000 },
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
    for (const s of SAMPLES) {
      await transactions.create(s, user);
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
