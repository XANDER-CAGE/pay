import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class RefundDto {
    @ApiProperty({ 
        description: 'Номер транзакции оплаты',
        example: 455
    })
    @IsNotEmpty()
    @IsInt() // принимает string | number, должно быть Long
    @Type(() => Number)
    TransactionId: number; //  Изменить тип

    @ApiPropertyOptional({ description: 'Любые другие данные, которые будут связаны с транзакцией' })
    @IsOptional()
    @IsObject()
    JsonData?: object;

    @ApiProperty({ 
        description: 'Сумма возврата в валюте транзакции, разделитель точка. Количество не нулевых знаков после точки – 2',
        example: 100.00
    })
    @IsNotEmpty()
    @IsNumber()
    Amount: number;
}
