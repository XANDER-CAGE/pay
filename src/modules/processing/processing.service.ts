import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { card, cashbox } from '@prisma/client';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { IDetermineProcessing } from './interfaces/determineProcessing.interface';
import { HumoProcessingService } from './humo.processing.service';
import { UzcardProcessingService } from './uzcard.processing.service';
import { IValidate } from './interfaces/validate.interface';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { IHandle3ds } from './interfaces/handle3ds.interface';
import { IHold } from './interfaces/hold.interface';
import * as crypto from 'crypto';
import { IGetDataByCardInfo } from './interfaces/getDataByCardResponse.interface';
import { IConfirmHold } from './interfaces/confirmHold.interface';
import { ICancelHold } from './interfaces/cancelHold.interface';
import { IRefund } from './interfaces/refund.interface';
import { IPayByToken } from './interfaces/payByToken.interface';
import { IConfirmHoldResponse } from './interfaces/confirmHoldResponse.interface';
import { IP2P, IP2PRes } from './interfaces/p2p.interface';
import { IGetDataByPanRes } from './interfaces/getDataByPan.interface';

@Injectable()
export class ProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly humoService: HumoProcessingService,
    private readonly uzcardService: UzcardProcessingService,
  ) {}

  private async determine(pan: string): Promise<IDetermineProcessing> {
    const bin = await this.prisma.bin.findFirst({
      where: {
        OR: [
          { bin: +pan.substring(0, 8) },
          { bin: +pan.substring(0, 7) },
          { bin: +pan.substring(0, 6) },
          { bin: +pan.substring(0, 4) },
        ],
      },
    });
    if (!bin) {
      const errorMsg = 'BIN не найден в базе данных: ' + pan.substring(0, 8);
      throw new NotFoundException(errorMsg);
    }
    return {
      processing: bin.processing,
      bankName: bin.bank_name,
    };
  }
  async sendOtp(
    pan: string,
    expiry: string,
    cardId: number,
    cashbox: cashbox,
  ): Promise<ISendOtp> {
    const { processing } = await this.determine(pan);
    let data: ISendOtp;
    if (processing == 'humo') {
      data = await this.humoService.sendOtp(pan, cardId, cashbox);
    } else if (processing == 'uzcard') {
      data = await this.uzcardService.sendOtp(pan, expiry, cardId);
    }
    return data;
  }

  async validate(
    pan: string,
    smsCode: string,
    otpId: string,
  ): Promise<IValidate> {
    const { processing, bankName } = await this.determine(pan);
    let data: IValidate;
    if (processing == 'humo') {
      data = await this.humoService.validate(smsCode, otpId, pan);
    } else if (processing == 'uzcard') {
      data = await this.uzcardService.validate(otpId, smsCode);
    }
    data.cardData.bankName = bankName || data.cardData.bankName;
    return data;
  }

  async handle3dsPost(obj: IHandle3ds): Promise<CoreApiResponse> {
    const { processing, bankName } = await this.determine(obj.pan);
    let data: CoreApiResponse;
    if (processing == 'uzcard') {
      data = await this.uzcardService.handle3dsPost(obj);
    } else if (processing == 'humo') {
      data = await this.humoService.handle3dsPost(obj);
    }
    data.Model.GatewayName = bankName;
    return data;
  }

  async hold(dto: IHold) {
    const { processing, bankName } = await this.determine(dto.pan);
    let data: CoreApiResponse;
    if (processing == 'humo') {
      data = await this.humoService.hold(dto);
    } else if (processing == 'uzcard') {
      data = await this.uzcardService.hold(dto);
    }
    data.Model.GatewayName = bankName;
    if (!dto.card.fullname || !dto.card.phone) {
      const { phone, fullname } = await this.getDataByCardInfo(
        dto.card,
        dto.pan,
      );
      const panRef = crypto.createHash('md5').update(dto.pan).digest('hex');
      await this.prisma.card.update({
        where: {
          id: dto.card.id,
        },
        data: {
          fullname,
          pan_ref: panRef,
          phone,
          bank_name: bankName,
          updated_at: new Date(),
        },
      });
    }
    return data;
  }

  async getDataByCardInfo(
    card: card,
    pan: string,
  ): Promise<IGetDataByCardInfo> {
    if (card.processing == 'humo') {
      const { phone, fullname, balance } = await this.humoService.getDataByPan(
        pan,
      );
      return {
        phone,
        fullname,
        balance,
      };
    } else if (card.processing == 'uzcard') {
      const { phone, fullname, balance } =
        await this.uzcardService.getDataByProcessingCardToken(
          card.processing_card_token,
        );
      return {
        phone,
        fullname,
        balance,
      };
    }
  }

  async confirmHold(data: IConfirmHold): Promise<IConfirmHoldResponse> {
    const { card, transaction, cashbox, amount } = data;
    if (card.processing == 'humo') {
      return await this.humoService.confirmHold({ transaction, amount });
    } else if (card.processing == 'uzcard') {
      return await this.uzcardService.confirmHold({
        cashbox,
        transaction,
        amount,
      });
    }
  }

  async cancelHold(data: ICancelHold) {
    if (data.card.processing == 'humo') {
      return await this.humoService.cancelHold(data.transaction);
    } else if (data.card.processing == 'uzcard') {
      return await this.uzcardService.cancelHold(data.transaction);
    }
  }

  async refund(data: IRefund) {
    if (data.card.processing == 'humo') {
      await this.humoService.refund(data.transaction);
    } else if (data.card.processing == 'uzcard') {
      await this.uzcardService.refund(data.transaction);
    }
  }

  async payByCard(dto: IPayByToken): Promise<CoreApiResponse> {
    const { pan, card } = dto;
    const { processing, bankName } = await this.determine(pan);
    let data: CoreApiResponse;
    if (processing == 'humo') {
      data = await this.humoService.payByToken(dto);
    } else if (processing == 'uzcard') {
      data = await this.uzcardService.payByToken(dto);
    }
    data.Model.GatewayName = bankName;
    if (!card.fullname || !card.phone) {
      const { phone, fullname } = await this.getDataByCardInfo(card, pan);
      const panRef = crypto.createHash('md5').update(pan).digest('hex');
      await this.prisma.card.update({
        where: {
          id: card.id,
        },
        data: {
          fullname,
          pan_ref: panRef,
          phone,
          bank_name: bankName,
          updated_at: new Date(),
        },
      });
    }
    return data;
  }

  async getDataByTransactionId(transactionId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
      },
      include: {
        card: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    const card = transaction.card;
    if (card.processing == 'humo') {
      return await this.humoService.getDataByTransactionId(
        transaction.processing_ref_num,
      );
    } else if (card.processing == 'uzcard') {
      return await this.uzcardService.getDataByTransactionId(
        transaction.invoice_id,
      );
    }
  }

  async p2p(dto: IP2P): Promise<IP2PRes> {
    if (dto.senderCard.processing == 'uzcard') {
      return await this.uzcardService.p2p(dto);
    }
  }

  async getDataByPan(pan: string): Promise<IGetDataByPanRes> {
    const { processing } = await this.determine(pan);
    if (processing == 'humo') {
      return await this.humoService.getDataByPan(pan);
    } else if (processing == 'uzcard') {
      return await this.uzcardService.getDataByPan(pan);
    }
  }
}
