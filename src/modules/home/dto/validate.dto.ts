import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ValidateDto {
  @ApiProperty()
  @IsNotEmpty()
  smsCode: string;

  @ApiProperty()
  @IsNotEmpty()
  otpId: string;

  @ApiProperty()
  @IsNotEmpty()
  TermUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  md: number;
}
