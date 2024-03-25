import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Min,
} from 'class-validator';

class PayerDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  FirstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  LastName: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  MiddleName: string;

  @ApiProperty({ type: Date })
  @IsDate()
  @IsOptional()
  Birth: Date;

  @ApiProperty()
  @IsString()
  @IsOptional()
  Address: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  Street: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  City: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  Country: string;

  @ApiProperty()
  @IsPhoneNumber()
  @IsOptional()
  Phone: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  Postcode: string;
}
export class PaymentChargeDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(1000)
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

  @ApiProperty()
  @IsOptional()
  @IsString()
  Name: string;

  @ApiProperty({ type: PayerDto })
  @IsOptional()
  Payer: PayerDto;
}
