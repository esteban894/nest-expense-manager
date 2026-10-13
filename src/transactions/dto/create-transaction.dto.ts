import { IsEnum, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TypeAmount } from '../models/typeAmount.model';

export const MAX_AMOUNT_CENTS = 2_000_000_000;

export class CreateTransactionDto {
  /** Monto en centavos, siempre positivo. El signo lo define typeAmount. */
  @IsInt()
  @Min(1)
  @Max(MAX_AMOUNT_CENTS)
  amount: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  description: string;

  @IsEnum(TypeAmount)
  typeAmount: TypeAmount;
}
