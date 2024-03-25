import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HumoProcessingService } from './humoProcessing.service';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { payment, processing_enum } from '@prisma/client';
import { UzCardProcessingService } from './uzCardProcessing.service';
import { CardType } from 'src/common/enum/cardType.enum';

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

@Injectable()
export class ProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly humoService: HumoProcessingService,
    private readonly uzCardService: UzCardProcessingService,
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
}
