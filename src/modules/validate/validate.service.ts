import { Injectable, NotFoundException } from '@nestjs/common';
import { ValidateDto } from './dto/validate.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DecryptService } from '../decrypt/decrypt.service';
import * as crypto from 'crypto';
import { ProcessingService } from '../processing/processing.service';

@Injectable()
export class ValidateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly decryptService: DecryptService,
    private readonly processingService: ProcessingService,
  ) {}

  async validate(dto: ValidateDto) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: +dto.md,
      },
    });
    if (!payment) {
      throw new NotFoundException('Транзакция не найдена.');
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    //генерим tk
    const tk = crypto.createHash('md5').update(pan).digest('hex');
    const cardData = await this.processingService.validate(
      pan,
      dto.smsCode,
      dto.otpId,
    );
    await this.prisma.card_info.upsert({
      where: {
        processing_id: String(cardData.processingId),
      },
      create: {
        processing_id: String(cardData.processingId),
        pan: String(cardData.pan),
        expiry: String(cardData.expiry),
        status: cardData.status,
        phone: cardData.phone,
        fullname: cardData.fullName,
        sms: cardData.sms,
        pincnt: cardData.pincnt,
        card_type: cardData.cardType,
        hold_amount: cardData.holdAmount,
        cashback_amount: cardData.cashbackAmount,
        aacct: cardData.aacct,
        par: cardData.par,
        tk: 'tk_' + tk,
        cashbox_id: payment.cashbox_id,
      },
      update: {
        pan: String(cardData.pan),
        expiry: String(cardData.expiry),
        status: cardData.status,
        phone: cardData.phone,
        fullname: cardData.fullName,
        sms: cardData.sms,
        pincnt: cardData.pincnt,
        card_type: cardData.cardType,
        hold_amount: cardData.holdAmount,
        cashback_amount: cardData.cashbackAmount,
        aacct: cardData.aacct,
        par: cardData.par,
        tk: 'tk_' + tk,
        cashbox_id: payment.cashbox_id,
      },
    });
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Authorized',
      },
    });
  }
}
