import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class ConfirmHoldDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  TransactionId: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  Amount: number;
}
