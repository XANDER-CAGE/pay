import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Validate } from 'class-validator';
import { Transform } from 'class-transformer';

class IsJsonStringOrNumber {
  validate(value: any) {
    if (typeof value === 'number' || typeof value === 'string') {
      return true;
    }
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  defaultMessage() {
    return 'md must be a valid JSON object, string, or number';
  }
}

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
  @Validate(IsJsonStringOrNumber)
  @Transform(({ value }) => {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed.transactionId ?? parsed;
      }
      return parsed;
    } catch {
      return value;
    }
  })
  md: any;
}
