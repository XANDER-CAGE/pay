import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsDateString, IsOptional, IsString, IsInt, Min, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

enum TransactionStatus {
    Authorized = 'Authorized',
    Completed = 'Completed', 
    Cancelled = 'Cancelled',
    Declined = 'Declined'
}

export class TransactionListV2Dto {
    @ApiProperty({ 
        description: 'Начальная дата создания операций',
        example: '2021-03-09T00:00:00+03:00'
    })
    @IsNotEmpty()
    @IsDateString()
    CreatedDateGte: string;

    @ApiProperty({ 
        description: 'Конечная дата создания операций',
        example: '2021-03-10T00:00:00+03:00'
    })
    @IsNotEmpty()
    @IsDateString()
    CreatedDateLte: string;

    @ApiProperty({ 
        description: 'Порядковый номер страницы, должно быть больше или равно 1',
        example: 1
    })
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    PageNumber: number;

    @ApiPropertyOptional({ 
        description: 'Код временной зоны, по умолчанию — UTC',
        example: 'MSK'
    })
    @IsOptional()
    @IsString()
    TimeZone?: string = 'UTC';

    @ApiPropertyOptional({ 
        description: 'Статус операций',
        enum: TransactionStatus,
        isArray: true,
        example: ['Authorized', 'Completed', 'Cancelled', 'Declined']
    })
    @IsOptional()
    @IsArray()
    @IsEnum(TransactionStatus, { each: true })
    Statuses?: TransactionStatus[] = [
        TransactionStatus.Authorized,
        TransactionStatus.Completed,
        TransactionStatus.Cancelled,
        TransactionStatus.Declined
    ];
}