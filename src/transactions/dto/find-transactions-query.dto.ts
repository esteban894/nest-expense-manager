import { IsDateString, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { TypeAmount } from '../models/typeAmount.model';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class FindTransactionsQueryDto {
  @IsOptional() @IsEnum(TypeAmount)
  type?: TypeAmount;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value) || undefined)
  @IsString() @Length(1, 80)
  search?: string;

  @IsOptional() @Matches(DATE) @IsDateString()
  from?: string;

  @IsOptional() @Matches(DATE) @IsDateString()
  to?: string;
}
