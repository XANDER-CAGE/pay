import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefundDto {
  @ApiProperty()
  @IsNotEmpty()
  TransactionId: string | number;
}
