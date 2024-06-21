import { ApiProperty } from '@nestjs/swagger';
import { processing } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateBinDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  bin: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  logoUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  hideCvvInput: boolean;

  @ApiProperty({ enum: processing })
  @IsEnum(processing)
  @IsNotEmpty()
  cardType: processing;

  @ApiProperty({ enum: processing })
  @IsNumber()
  @IsNotEmpty()
  countryCode: number;
}
