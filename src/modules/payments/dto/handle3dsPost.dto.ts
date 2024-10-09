import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class Handle3dsPostDto {
  @ApiProperty()
  @IsNotEmpty()
  TransactionId: number | string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  PaRes: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  HomeUrl: string;
}
