import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsUrl } from 'class-validator';

export class ValidateDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  smsCode: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  otpId: number;

  @ApiProperty()
  @IsUrl()
  @IsNotEmpty()
  TermUrl: string;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  md: number;
}
