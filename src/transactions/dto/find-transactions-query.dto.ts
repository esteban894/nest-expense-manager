import { IsEnum, IsISO8601, IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { TypeAmount } from '../models/typeAmount.model';

export class FindTransactionsQueryDto {
  @IsOptional() @IsEnum(TypeAmount)
  type?: TypeAmount;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) || undefined)
  @IsString() @Length(1, 80)
  search?: string;

  /** Instante ISO 8601 (inclusivo), p. ej. inicio del día local del cliente en UTC. */
  @IsOptional() @IsISO8601({ strict: true })
  from?: string;

  /** Instante ISO 8601 (exclusivo), p. ej. inicio del día siguiente al "hasta" elegido. */
  @IsOptional() @IsISO8601({ strict: true })
  to?: string;
}
