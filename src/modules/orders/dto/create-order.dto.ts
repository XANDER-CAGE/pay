import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 10.0 })
  @IsNumber()
  @IsNotEmpty()
  Amount: number;

  @ApiProperty({ example: 'UZS', required: false })
  @IsOptional()
  @IsString()
  Currency?: string;

  @ApiProperty({ example: 'Оплата на сайте example.com', required: false })
  @IsOptional()
  @IsString()
  Description?: string;

  @ApiProperty({ example: 'client@test.local', required: false })
  @IsOptional()
  Email?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  RequireConfirmation?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  SendEmail?: boolean;

  @ApiProperty({ example: '12345', required: false })
  @IsOptional()
  @IsString()
  InvoiceId?: string;

  @ApiProperty({ example: 'user123', required: false })
  @IsOptional()
  @IsString()
  AccountId?: string;

  @ApiProperty({ example: 'https://example.com/offer', required: false })
  @IsOptional()
  @IsString()
  OfferUri?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  Phone?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  SendSms?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  SendViber?: boolean;

  @ApiProperty({ example: 'ru-RU', required: false })
  @IsOptional()
  CultureName?: string;

  @ApiProperty({ example: 'CreateMonthly', required: false })
  @IsOptional()
  SubscriptionBehavior?: string;

  @ApiProperty({ example: 'https://example.com/success', required: false })
  @IsOptional()
  SuccessRedirectUrl?: string;

  @ApiProperty({ example: 'https://example.com/fail', required: false })
  @IsOptional()
  FailRedirectUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  JsonData?: object;
}
