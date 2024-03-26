import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { CardType } from 'src/common/enum/cardType.enum';
import { payment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DecryptService } from '../decrypt/decrypt.service';
import * as crypto from 'crypto';

interface IValidate {
  processingId: string | number;
  pan: string | number;
  expiry: string | number;
  phone: string;
  fullName: string;
  status: any;
  sms: boolean;
  pincnt: any;
  cardType: CardType;
  holdAmount: number;
  cashbackAmount: number;
  aacct: any;
  par: any;
}

interface IHandle3dsPost {
  PublicId: string;
  AccountId: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardHolderName: string;
  CardToken: string;
  Status: 'Declined' | 'Completed';
  Reason: string | null;
  Processing: CardType;
  Expiry: string;
  Success: boolean;
}

@Injectable()
export class UzCardProcessingService {
  private readonly uzCardUrl: string;
  private readonly uzCardLogin: string;
  private readonly uzCardPassword: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly decryptService: DecryptService,
  ) {
    this.uzCardLogin = process.env.UZCARD_LOGIN;
    this.uzCardPassword = process.env.UZCARD_PASSWORD;
    this.uzCardUrl = process.env.UZCARD_API_URL;
  }

  async sendOtp(pan: string, expiry: string): Promise<ISendOtp> {
    const requestData = {
      jsonrpc: '2.0',
      id: '123',
      method: 'cards.new.otp',
      params: {
        card: {
          pan,
          expiry,
        },
      },
    };

    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    if (!response.data || !response.data.result) {
      throw new NotAcceptableException('Send otp: Wrong credentials');
    }
    const otpId = response.data.result.id;
    const phone = response.data.result.phoneMask;
    return { otpId, phone };
  }

  async validate(otpId: number, smsCode: number): Promise<IValidate> {
    const requestData = {
      jsonrpc: '2.0',
      id: '123',
      method: 'cards.new.verify',
      params: {
        otp: {
          id: otpId,
          code: smsCode,
        },
      },
    };
    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    if (!response.data?.result) {
      throw new NotFoundException('Данные OTP не найдены.');
    }
    const cardData = response.data.result;
    return {
      processingId: cardData.id,
      pan: cardData.pan,
      expiry: cardData.expiry,
      phone: cardData.phone,
      status: cardData.status,
      fullName: cardData.fullName,
      sms: cardData.sms,
      pincnt: cardData.pincnt,
      cardType: CardType.UZCARD,
      holdAmount: cardData.holdAmount,
      cashbackAmount: cardData.cashbackAmount,
      aacct: cardData.aacct,
      par: cardData.par,
    };
  }

  async handle3dsPost(payment: payment): Promise<IHandle3dsPost> {
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: payment.cashbox_id,
        type: 'uzcard',
      },
    });
    if (!epos) {
      throw new NotFoundException('EPOS for Uzcard not found');
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: {
        id: payment.cashbox_id,
      },
    });
    const company = await this.prisma.company.findFirst({
      where: {
        id: cashbox.companyId,
      },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const { expiry, pan } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const tk = crypto.createHash('md5').update(pan).digest('hex');
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: 'tk_' + tk,
      },
    });
    const requestData = {
      id: 1,
      jsonrpc: '2.0',
      method: 'trans.pay.purpose',
      params: {
        tran: {
          purpose: 'payment',
          receiverId: company.account_id, // Эти данные нужно определить или получить
          cardId: cardInfo.processing_id, // Используем cardId из данных платежа
          amount: payment.amount, // Используем сумму платежа
          comission: '20',
          //commission: cashbox.commission, // Указываем комиссию, если она известна
          currency: '860', // Валюта платежа
          ext: payment.invoice_id, // Дополнительная информация, если нужна
          merchantId: epos.merchant_id, // ID мерчанта, если известен
          terminalId: epos.terminal_id, // ID терминала, если известен
        },
      },
    };
    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    const failReason = response.data?.error?.message;
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        processing: 'uzcard',
        status: failReason ? 'Declined' : 'Completed',
        processing_id: BigInt(response.data?.result?.refNum) || null,
      },
    });
    return {
      PublicId: cashbox.public_id,
      AccountId: company.account_id,
      CardFirstSix: pan.substring(0, 6),
      CardLastFour: pan.slice(-4),
      CardHolderName: cardInfo.fullname,
      CardToken: cardInfo.tk,
      Status: failReason ? 'Declined' : 'Completed',
      Reason: failReason || null,
      Processing: CardType.UZCARD,
      Expiry: expiry,
      Success: failReason ? false : true,
    };
  }

  async refund(payment: payment) {
    try {
      const epos = await this.prisma.epos.findFirst({
        where: {
          cashbox_id: payment.cashbox_id,
          type: 'uzcard',
        },
      });
      if (!epos) {
        throw new NotFoundException('EPOS for uzcard not found');
      }
      const requestData = {
        jsonrpc: '2.0',
        method: 'trans.reverse',
        id: 123,
        params: {
          tranId: String(payment.processing_id),
        },
      };
      const { data } = await axios.post(this.uzCardUrl, requestData, {
        auth: {
          username: this.uzCardLogin,
          password: this.uzCardPassword,
        },
      });
      if (data.result[0]?.status != 'OK' || data.result[0]?.status != 'ROK') {
        throw new Error('Something went wrong: ' + data.result[0]?.respText);
      }
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          refunded: true,
        },
      });
      return { success: true };
    } catch (error) {
      console.log(error);
      throw new Error('Error refunding');
    }
  }
}
