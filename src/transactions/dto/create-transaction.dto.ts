import { IsInt, IsString, MinLength } from 'class-validator';

export class CreateTransactionDto {
  @IsInt()
  amount: number;

  @IsString()
  @MinLength(1)
  description: string;

  @IsString()
  typeAmount: string;
}
