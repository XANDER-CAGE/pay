import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { IsOptional } from 'class-validator';

export class PayByTokenDto {
  @ApiProperty()
  @IsNotEmpty()
  Amount: string | number;

  @ApiProperty()
  @IsNotEmpty()
  Currency: string;

  @ApiProperty()
  @IsNotEmpty()
  InvoiceId: string;

  @ApiProperty()
  @IsOptional()
  Description: string;

  @ApiProperty()
  @IsNotEmpty()
  AccountId: string;

  @ApiProperty()
  @IsNotEmpty()
  Token: string;
}
