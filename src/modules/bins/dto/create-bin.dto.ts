import { ApiProperty } from '@nestjs/swagger';
import { processing_enum } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

export class CreateBinDto {
  @ApiProperty()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  bin: string;

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

  @ApiProperty({ enum: processing_enum })
  @IsEnum(processing_enum)
  @IsNotEmpty()
  cardType: processing_enum;

  @ApiProperty({ enum: processing_enum })
  @IsNumber()
  @IsNotEmpty()
  countryCode: number;
}
