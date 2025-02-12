import { Injectable } from '@nestjs/common';
import { ReceiptRequest } from './dto/receipe-dto';
import { ZplatFiscalizationService } from './zplat.ofd.service';

@Injectable()
export class ReceiptService {
  constructor(
    private readonly zplatFiscalizationService: ZplatFiscalizationService,
  ) {}
  fiscalize(dto: ReceiptRequest) {
    return this.zplatFiscalizationService.fiscalizeReceipt(dto);
  }
}
