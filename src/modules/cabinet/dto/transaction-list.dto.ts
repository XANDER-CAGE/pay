import { ApiPropertyOptional } from '@nestjs/swagger';
import { transaction_type } from '@prisma/client';
import { IsDate, IsEnum, IsInt, IsOptional, Min } from 'class-validator';

enum transactionType {
  hold = 'hold',
  threeds = 'threeds',
  charge = 'charge',
}

enum transactionStatus {
  completed = 'Completed',
  declined = 'Declined',
  authorized = 'Authorized',
}

export class TransactionListDto {
  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  limit = 10;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  startDate: Date;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  endDate: Date;

  @ApiPropertyOptional({ enum: transaction_type })
  @IsEnum(transaction_type)
  @IsOptional()
  transactionType: transaction_type;

  @ApiPropertyOptional({ enum: transactionStatus })
  @IsEnum(transactionStatus)
  @IsOptional()
  transactionStatus: transactionStatus;
}
