import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HumoProcessingService } from './humoProcessing.service';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { payment, processing_enum } from '@prisma/client';
import { UzCardProcessingService } from './uzCardProcessing.service';
import { CardType } from 'src/common/enum/cardType.enum';
import { DecryptService } from '../decrypt/decrypt.service';
import { PayByTokenDto } from '../payments/dto/payByToken.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';

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

interface IHandle3dsPost {
  PublicId: string;
  AccountId: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardHolderName: string;
  CardToken: string;
  Status: 'Declined' | 'Completed';
  Reason?: string | null;
  Processing: CardType;
  Expiry: string;
  Success: boolean;
  BankName?: string;
}

interface IPayByToken {
  PublicId: string;
  AccountId: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardHolderName: string;
  CardToken: string;
  Status: 'Declined' | 'Completed';
  Reason?: string | null;
  Processing: CardType;
  Expiry: string;
  Success: boolean;
  BankName?: string;
  TransactionId: number;
}

@Injectable()
export class ProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly humoService: HumoProcessingService,
    private readonly uzCardService: UzCardProcessingService,
    private readonly decryptService: DecryptService,
  ) {}

  private async determine(pan: string): Promise<IDetermineProcessing> {
    const binFromPan = pan.substring(0, 4);
    try {
      const bin = await this.prisma.bin.findFirst({
        where: {
          bin: {
            startsWith: binFromPan,
          },
        },
      });
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

  async handle3dsPost(payment: payment, pan: string): Promise<IHandle3dsPost> {
    const { processing, bankName } = await this.determine(pan);
    let data: IHandle3dsPost;
    if (processing == 'uzcard') {
      data = await this.uzCardService.handle3dsPost(payment);
    } else if (processing == 'humo') {
      data = await this.humoService.handle3dsPost(payment);
    }
    data.BankName = bankName;
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

  async payByCard(dto: PayByTokenDto, req: MyReq): Promise<IPayByToken> {
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: dto.Token,
      },
    });
    if (!cardInfo) {
      throw new NotFoundException('Card not found');
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      cardInfo.card_cryptogram_packet,
    );
    const { processing, bankName } = await this.determine(pan);
    let data: IPayByToken;
    if (processing == 'humo') {
      data = await this.humoService.payByToken(dto, req);
    } else if (processing == 'uzcard') {
      data = await this.uzCardService.payByToken(dto, req);
    }
    data.BankName = bankName;
    data.CardFirstSix = pan.substring(0, 6);
    data.CardLastFour = pan.slice(-4);
    return data;
  }
}
