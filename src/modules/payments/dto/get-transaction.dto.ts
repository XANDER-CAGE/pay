import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt } from 'class-validator';

export class GetTransactionDto {
  @ApiProperty({ description: 'Номер транзакции' })
  @IsNotEmpty()
  @IsInt()
  TransactionId: number;
}