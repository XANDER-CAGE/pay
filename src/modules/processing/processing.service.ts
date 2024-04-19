import {
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HumoProcessingService } from './humoProcessing.service';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { bin, card_info, payment, processing_enum } from '@prisma/client';
import { UzCardProcessingService } from './uzCardProcessing.service';
import { CardType } from 'src/common/enum/cardType.enum';
import { DecryptService } from '../decrypt/decrypt.service';
import { PayByTokenDto } from '../payments/dto/payByToken.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import * as crypto from 'crypto';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { BINS_SYMBOL, binsType } from 'src/common/parsedCache/parsedCache.bins';

interface IDetermineProcessing {
  bankName: string;
  processing: processing_enum;
}
interface IValidate {
  processingId: string | number;
  pan: string | number;
  expiry: string | number;
  phone: string;
  fullName: string;
  status?: any;
  sms?: boolean;
  pincnt?: any;
  cardType: CardType;
  holdAmount?: number;
  cashbackAmount?: number;
  aacct?: any;
  par?: any;
}
interface IGetDataByCardInfo {
  fullname: string;
  phone: string;
  balance: string;
}

@Injectable()
export class ProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly humoService: HumoProcessingService,
    private readonly uzCardService: UzCardProcessingService,
    private readonly decryptService: DecryptService,
    @Inject(BINS_SYMBOL)
    private readonly bins: binsType,
  ) {}

  private async determine(pan: string): Promise<IDetermineProcessing> {
    try {
      let bin: bin;
      bin =
        this.bins[pan.substring(0, 8)] ||
        this.bins[pan.substring(0, 7)] ||
        this.bins[pan.substring(0, 6)] ||
        this.bins[pan.substring(0, 4)];
      const binFromPan = pan.substring(0, 4);
      if (!bin) {
        bin = await this.prisma.bin.findFirst({
          where: {
            OR: [
              { bin: { startsWith: pan.substring(0, 8) } },
              { bin: { startsWith: pan.substring(0, 7) } },
              { bin: { startsWith: pan.substring(0, 6) } },
              { bin: { startsWith: pan.substring(0, 4) } },
            ],
          },
        });
      }

      if (!bin) {
        const errorMsg = 'BIN не найден в базе данных: ' + binFromPan;
        console.error(errorMsg);
        throw new NotFoundException(errorMsg);
      }
      return {
        processing: bin.card_type,
        bankName: bin.bank_name,
      };
    } catch (error) {
      const errMsg = 'Error in determineProcessing: ' + error.message;
      console.error(errMsg);
      throw error;
    }
  }

  async sendOtp(pan: string, expiry: string): Promise<ISendOtp> {
    const { processing } = await this.determine(pan);
    let data: ISendOtp;
    if (processing == 'humo') {
      data = await this.humoService.sendOtp(pan);
    } else if (processing == 'uzcard') {
      data = await this.uzCardService.sendOtp(pan, expiry);
    }
    return data;
  }

  async validate(
    pan: string,
    smsCode: number,
    otpId: number,
  ): Promise<IValidate> {
    const { processing } = await this.determine(pan);
    let data: IValidate;
    if (processing == 'humo') {
      data = await this.humoService.validate(smsCode, otpId, pan);
    } else if (processing == 'uzcard') {
      data = await this.uzCardService.validate(otpId, smsCode);
    }
    return data;
  }

  async handle3dsPost(payment: payment, pan: string): Promise<CoreApiResponse> {
    const { processing, bankName } = await this.determine(pan);
    let data: CoreApiResponse;
    if (processing == 'uzcard') {
      data = await this.uzCardService.handle3dsPost(payment);
    } else if (processing == 'humo') {
      data = await this.humoService.handle3dsPost(payment);
    }
    data.Model.GatewayName = bankName;
    return data;
  }

  async refund(transactionId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: transactionId,
      },
    });
    if (!payment) {
      throw new NotFoundException('Transactions not found');
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    if (payment.status != 'Completed') {
      throw new NotAcceptableException('Transaction not completed');
    }
    const { processing } = await this.determine(pan);
    if (processing == 'humo') {
      await this.humoService.refund(payment);
    } else if (processing == 'uzcard') {
      await this.uzCardService.refund(payment);
    }
  }

  async payByCard(dto: PayByTokenDto, req: MyReq): Promise<CoreApiResponse> {
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: dto.Token,
      },
    });
    if (!cardInfo) {
      return CoreApiResponse.issuerNotFound({
        Amount: +dto.Amount,
        Date: new Date(),
        Description: dto.Description,
        InvoiceId: String(dto.InvoiceId),
        AccountId: String(dto.AccountId),
        Token: dto.Token,
      });
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      cardInfo.card_cryptogram_packet,
    );
    const { processing, bankName } = await this.determine(pan);
    let data: CoreApiResponse;
    if (processing == 'humo') {
      data = await this.humoService.payByToken(dto, req);
    } else if (processing == 'uzcard') {
      data = await this.uzCardService.payByToken(dto, req);
    }
    data.Model.GatewayName = bankName;
    if (!cardInfo.fullname || !cardInfo.phone) {
      const { phone, fullname } = await this.getDataByCardInfo(cardInfo);
      const panRef = crypto.createHash('md5').update(pan).digest('hex');
      await this.prisma.card_info.update({
        where: {
          id: cardInfo.id,
        },
        data: {
          fullname,
          pan_ref: panRef,
          account_id: String(dto.AccountId),
          phone,
        },
      });
    }
    return data;
  }

  async getDataByTransactionId(transactionId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: transactionId,
      },
    });
    if (!payment) {
      throw new NotFoundException('Transaction not found');
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const { processing } = await this.determine(pan);
    if (processing == 'humo') {
      return await this.humoService.getDataByTransactionId(
        payment.processing_id,
      );
    } else if (processing == 'uzcard') {
      return await this.uzCardService.getDataByTransactionId(
        payment.invoice_id,
      );
    }
  }

  private async getDataByCardInfo(
    cardInfo: card_info,
  ): Promise<IGetDataByCardInfo> {
    if (cardInfo.card_type == 'humo') {
      const { pan } = this.decryptService.decryptCardCryptogram(
        cardInfo.card_cryptogram_packet,
      );
      const { phone, fullname, balance } =
        await this.humoService.getDataByPan(pan);
      return {
        phone,
        fullname,
        balance,
      };
    } else if (cardInfo.card_type == 'uzcard') {
      const { phone, fullname, balance } =
        await this.uzCardService.getDataByProcessingCardToken(
          cardInfo.processing_id,
        );
      return {
        phone,
        fullname,
        balance,
      };
    }
  }
}
