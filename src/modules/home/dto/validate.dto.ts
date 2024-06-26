import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString, IsUrl } from 'class-validator';

export class ValidateDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  smsCode: string;

  @ApiProperty()
  @IsNumberString()
  @IsNotEmpty()
  otpId: string;

  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  TermUrl: string;

  @ApiProperty()
  @IsNumberString()
  @IsNotEmpty()
  md: string;
}
