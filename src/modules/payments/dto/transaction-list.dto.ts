import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';

export class TransactionListDto {
    @ApiProperty({ 
        description: 'Дата создания операций',
        example: '2025-04-09'
    })
    @IsNotEmpty()
    @IsDateString()
    Date: string;

    @ApiPropertyOptional({ 
        description: 'Код временной зоны, по умолчанию — UTC',
        example: 'MSK'
    })
    @IsOptional()
    @IsString()
    TimeZone?: string = 'UTC';
}