import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ValidateDto {
  @ApiProperty()
  @IsNotEmpty()
  smsCode: number;

  @ApiProperty()
  @IsNotEmpty()
  otpId: number;

  @ApiProperty()
  @IsNotEmpty()
  TermUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  md: number;
}
