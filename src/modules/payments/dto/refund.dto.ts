import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class RefundDto {
  @ApiProperty()
  @IsNotEmpty()
  TransactionId: string | number;

  @ApiProperty()
  @IsOptional()
  Amount: string | number;
}
