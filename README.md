# Cuentas Claras - API

Backend NestJS + TypeORM + MySQL para el gestor de gastos. Swagger en `/docs`; todas las rutas bajo `/api/v1`.

## Puesta en marcha

```bash
npm install
docker compose up -d        # MySQL (puerto 3307 en el host) y app
npm run start:dev           # alternativa local (ajustar DATABASE_HOST/PORT)
npm test                    # tests unitarios
```

## Montos en centavos

Todos los montos son **enteros en centavos** (`$ 850.000,00` = `85000000`).

- Al crear (`POST`) o editar se envía el monto **positivo**; el signo lo deriva `typeAmount` (`income` suma, `expense_*` resta).
- Las respuestas devuelven `amount` con signo y los totales del resumen, todo en centavos.
- Bases existentes con montos en pesos: ejecutar **una sola vez** `scripts/2026-10-amount-to-cents.sql` (multiplica `amount` por 100).

## Endpoints

Auth: `POST /auth/register` (`{name,email,password}`) y `POST /auth/login` (`{email,password}` -> `{token,email}`). Las rutas de transacciones requieren `Authorization: Bearer <token>` y están limitadas al usuario dueño (404 si no es suyo).

| Método | Ruta | Descripción | Query params |
| --- | --- | --- | --- |
| POST | `/transactions` | Crea una transacción `{amount, description, typeAmount}` | - |
| GET | `/transactions` | Lista, más recientes primero | `type` (`income`, `expense_necessary`, `expense_unnecessary`), `search` (texto en descripción), `from` y `to` (instantes ISO 8601, p. ej. `2026-10-13T03:00:00.000Z`; `from` inclusivo, `to` exclusivo; `from < to` o 400). El cliente envía el inicio de su día local para `from` y el inicio del día siguiente al "hasta" para `to` |
| GET | `/transactions/summary` | `{balance, income, expense, necessary, unnecessary, counts}` en centavos | - |
| GET | `/transactions/:id` | Detalle | - |
| PATCH | `/transactions/:id` | Edita | - |
| DELETE | `/transactions/:id` | Borrado lógico | - |
| PATCH | `/transactions/:id/restore` | Restaura una transacción borrada | - |

## Cuenta demo

```bash
npm run seed:demo
```

Crea (si no existe) `demo@cuentasclaras.app` / `portfolio2026` (Ana Pérez), borra sus transacciones y carga 9 de ejemplo. Es idempotente. Desde el host, con MySQL en docker:

```bash
DATABASE_HOST=127.0.0.1 DATABASE_PORT=3307 npm run seed:demo
```
