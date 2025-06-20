import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ConfirmHoldDto {
  @ApiProperty({ description: 'Номер транзакции в системе' })
  @IsNotEmpty()
  @IsInt() // Должно быть Long согласно документации, исправлено
  @Type(() => Number)
  TransactionId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  Amount: number;
}
