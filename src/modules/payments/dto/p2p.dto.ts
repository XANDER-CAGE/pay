import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class P2PDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  senderToken: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  receiverPan: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  amount: string
}
