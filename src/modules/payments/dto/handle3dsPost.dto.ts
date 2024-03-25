import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class Handle3dsPostDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  TransactionId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  PaRes: string;
}
