import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PaymentChargeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  Amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  InvoiceId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  CardCryptogramPacket: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  Description: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  AccountId: string;
}
