import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DecrypPostDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  encryptedData: string;
}
