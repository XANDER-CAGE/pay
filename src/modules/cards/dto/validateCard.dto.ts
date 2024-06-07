import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateCardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  SmsCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  OtpId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  Tk: string;
}
