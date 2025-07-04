import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsOptional, IsPositive, IsString, IsUrl } from 'class-validator';

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

  @ApiProperty()
  @IsString()
  @IsOptional()
  HomeUrl: string;
}
