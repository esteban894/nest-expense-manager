-- Migra montos en pesos enteros a centavos con signo según el tipo
-- (income > 0, expense_* < 0).
--
-- Ejecutar UNA SOLA VEZ: correrlo de nuevo vuelve a multiplicar por 100.
--
-- Límite: la columna es INT (máx. 2.147.483.647 centavos). Filas con más de
-- ~21.4 millones de pesos desbordan; en modo estricto (default en MySQL 8)
-- la sentencia falla completa y no se modifica ninguna fila. Revisar antes:
--   SELECT id, amount FROM `transaction` WHERE ABS(amount) > 21474836;
UPDATE `transaction`
SET amount = (CASE WHEN typeAmount = 'income' THEN ABS(amount) ELSE -ABS(amount) END) * 100;
