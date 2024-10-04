import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CheckAreqPostDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  PaReq: string;

  @ApiProperty()
  @IsNotEmpty()
  MD: string | number;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  TermUrl: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUrl()
  HomeUrl: string;
}
