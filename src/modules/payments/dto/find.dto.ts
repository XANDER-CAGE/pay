import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class FindDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  InvoiceId: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  cashboxId: number;
}
