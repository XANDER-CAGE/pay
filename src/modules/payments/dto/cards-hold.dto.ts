import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CardsHoldDto {
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
  @IsOptional()
  JsonData: object;

  @ApiProperty()
  @IsNotEmpty()
  CardCryptogramPacket: string;
}
