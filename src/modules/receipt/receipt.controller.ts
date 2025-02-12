import { Body, Controller, Post } from '@nestjs/common';
import { ReceiptRequest } from './dto/receipe-dto';
import { ReceiptService } from './receipt.service';

@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
  create(@Body() receiptDto: ReceiptRequest) {
    return this.receiptService.fiscalize(receiptDto);
  }
}
