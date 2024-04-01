import { ApiProperty } from '@nestjs/swagger';
import { processing_enum } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateCardDto {
  @ApiProperty()
  @IsNotEmpty()
  pan: string;

  @ApiProperty()
  @IsNotEmpty()
  expiry: string;

  @ApiProperty()
  @IsNotEmpty()
  processingId: string;

  @ApiProperty()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @IsNotEmpty()
  cryptogram: string;

  @ApiProperty({ enum: processing_enum })
  @IsNotEmpty()
  @IsEnum(processing_enum)
  cardType: processing_enum;

  @ApiProperty()
  @IsNotEmpty()
  cashboxId: number;
}
