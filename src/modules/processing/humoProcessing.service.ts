import axios from 'axios';
import { SendSmsWithPlayMobile } from 'src/common/utils/smsSender.util';
import { PrismaService } from '../prisma/prisma.service';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import {
  BadRequestException,
  Inject,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { CardType } from 'src/common/enum/cardType.enum';
import { payment } from '@prisma/client';
import { DecryptService } from '../decrypt/decrypt.service';
import * as soap from 'soap';
interface IGetDataByPan {
  phone: string;
  nameOnCard: string;
  expiry: string;
}
interface IValidate {
  processingId: string | number;
  pan: string | number;
  expiry: string | number;
  phone: string;
  fullName: string;
  cardType: CardType;
}
interface IHoldRequest {
  paymentIdFromHumo: string | number;
  paymentRefFromHumo: string | number;
}
interface IHandle3dsPost {
  Currency: string;
  PublicId: string;
  AccountId: string;
  TransactionId: number;
  InvoiceId: string;
  IpAddress: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardHolderName: string;
  CardToken: string;
  Processing: CardType;
  Expiry: string;
  Success: boolean;
  Status: 'Declined' | 'Completed';
}

export class HumoProcessingService {
  private readonly humoSoapUrl: string;
  private readonly humoSoapUsername: string;
  private readonly humoSoapPassword: string;
  private readonly humoSoapCenterId: string;
  private readonly humoSoapPointCode: string;
  private readonly humoMiddlewareToken: string;
  private readonly humoMiddlewareUrl: string;
  constructor(
    @Inject(SendSmsWithPlayMobile)
    private readonly smsSender: SendSmsWithPlayMobile,
    private readonly prisma: PrismaService,
    private readonly decrypService: DecryptService,
  ) {
    this.humoSoapUrl = process.env.HUMO_SOAP_HOST;
    this.humoSoapUsername = process.env.HUMO_SOAP_USERNAME;
    this.humoSoapPassword = process.env.HUMO_SOAP_PASSWORD;
    this.humoSoapCenterId = process.env.HUMO_CENTER_ID;
    this.humoSoapPointCode = process.env.HUMO_POINT_CODE;
    this.humoMiddlewareToken = process.env.HUMO_MIDDLEWARE_TOKEN;
    this.humoMiddlewareUrl = process.env.HUMO_MIDDLEWARE_URL;
  }
  async sendOtp(pan: string): Promise<ISendOtp> {
    const { phone } = await this.getDataByPan(pan);
    const otp = this.generateOtp();
    const message = `Ваш код подтверждения: ${otp}`;
    await this.smsSender.send(phone, message);
    const { id } = await this.prisma.otp.create({
      data: {
        code: +otp,
      },
    });
    return {
      otpId: id,
      phone,
    };
  }

  private async getDataByPan(pan: string): Promise<IGetDataByPan> {
    try {
      const url = this.humoMiddlewareUrl + '/v3/iiacs/card';
      const val = {
        params: {
          primaryAccountNumber: pan,
          mb_flag: 1,
        },
      };
      const config = {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
          Authorization: 'Bearer: ' + this.humoMiddlewareToken,
        },
      };

      const { data } = await axios.post(url, val, config);
      return {
        phone: data.result.mb.phone,
        nameOnCard: data.result.card.nameOnCard,
        expiry: data.result.card.expiry,
      };
    } catch (error) {
      const errorMessage = 'Error retrieving phone by pan: ' + error.message;
      console.log(errorMessage);
      throw new Error(errorMessage);
    }
  }

  private generateOtp(): string {
    let otp = '';
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    otp += firstDigit.toString();
    for (let i = 0; i < 5; i++) {
      const digit = Math.floor(Math.random() * 10).toString();
      otp += digit;
    }
    return otp;
  }

  async validate(
    smsCode: number,
    otpId: number,
    pan: string,
  ): Promise<IValidate> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        id: otpId,
      },
    });
    if (!otp) {
      throw new NotFoundException('Otp not found');
    }
    if (otp.code != smsCode) {
      throw new NotAcceptableException('Wrong credentials');
    }
    const { expiry, nameOnCard, phone } = await this.getDataByPan(pan);

    const cardId = crypto
      .createHash('md5')
      .update(`${pan}@${expiry}`)
      .digest('hex');

    return {
      cardType: CardType.HUMO,
      expiry,
      fullName: nameOnCard,
      pan,
      phone,
      processingId: cardId,
    };
  }

  async handle3dsPost(payment: payment): Promise<IHandle3dsPost> {
    const { paymentIdFromHumo, paymentRefFromHumo } =
      await this.holdRequest(payment);
    await this.confirmPaymentHumo(paymentIdFromHumo, paymentRefFromHumo);
    const cashbox = await this.prisma.cashbox.findFirst({
      where: {
        id: payment.cashbox_id,
      },
      include: {
        company: {
          select: {
            account_id: true,
          },
        },
      },
    });
    const { pan, expiry } = this.decrypService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const tk = crypto.createHash('md5').update(pan).digest('hex');
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: 'tk_' + tk,
      },
    });
    const { nameOnCard } = await this.getDataByPan(pan);
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        processing: 'humo',
        status: 'Completed',
      },
    });
    return {
      Currency: payment.currency,
      PublicId: cashbox.public_id,
      AccountId: cashbox.company.account_id,
      TransactionId: payment.id,
      InvoiceId: payment.invoice_id,
      IpAddress: payment.ip_address,
      CardFirstSix: pan.substring(0, 6),
      CardLastFour: pan.slice(-4),
      CardHolderName: nameOnCard,
      CardToken: cardInfo.tk,
      Processing: CardType.HUMO,
      Expiry: expiry,
      Success: true,
      Status: 'Completed',
    };
  }

  private async holdRequest(payment: payment): Promise<IHoldRequest> {
    try {
      const epos = await this.prisma.epos.findFirst({
        where: {
          cashbox_id: payment.cashbox_id,
          type: 'humo',
        },
      });
      if (!epos) {
        throw new NotFoundException('EPOS for Humo not found');
      }
      const { pan, expiry } = this.decrypService.decryptCardCryptogram(
        payment.card_cryptogram_packet,
      );

      const data = {
        language: 'en',
        billerRef: 'SOAP_DMS',
        payinstrRef: 'SOAP_DMS',
        sessionID: 'SOAP_DMS_20220106090000', //сюда генерить random uuid?
        paymentRef: payment.id,
        details: {
          item: [
            { name: 'pan', value: pan },
            { name: 'expiry', value: expiry },
            { name: 'ccy_code', value: '860' },
            { name: 'amount', value: payment.amount },
            { name: 'merchant_id', value: epos.merchant_id },
            { name: 'terminal_id', value: epos.terminal_id },
            { name: 'point_code', value: this.humoSoapPointCode },
            { name: 'centre_id', value: this.humoSoapCenterId },
          ],
        },
        paymentOriginator: this.humoSoapUsername,
      };
      const client = await soap.createClientAsync(this.humoSoapUrl, {
        wsdl_options: {
          method: 'post',
          overrides: {
            ebppif1: 'urn:PaymentServer',
          },
          data,
        },
      });
      client.setSecurity(
        new soap.BasicAuthSecurity(
          this.humoSoapUsername,
          this.humoSoapPassword,
        ),
      );
      const response = await client.PaymentAsync(data);
      const jsonData = response[0];
      if (jsonData.action != 4) {
        throw new BadRequestException('Error holding payment');
      }
      return {
        paymentIdFromHumo: jsonData.paymentID,
        paymentRefFromHumo: jsonData.paymentRef,
      };
    } catch (error) {
      console.log('Error hold request humo: ' + error.message);
      throw new Error('Error hold request humo');
    }
  }

  async confirmPaymentHumo(
    paymentIDFromHumo: string | number,
    paymentRefFromHumo: string | number,
  ) {
    try {
      const data = {
        paymentID: paymentIDFromHumo,
        paymentRef: paymentRefFromHumo,
        confirmed: true,
        finished: true,
        paymentOriginator: this.humoSoapUsername,
      };
      const client = await soap.createClientAsync(this.humoSoapUrl, {
        wsdl_options: {
          method: 'POST',
          data,
        },
      });
      client.setSecurity(
        new soap.BasicAuthSecurity(
          this.humoSoapUsername,
          this.humoSoapPassword,
        ),
      );
      const response = await client.PaymentAsync(data);
      const jsonData = response[0];
      return jsonData;
    } catch (error) {
      console.log('Error confirming payment ' + error.message);
      throw new Error('Error confirming payment ');
    }
  }
}
