import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAReqDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  aReq: string;
}
