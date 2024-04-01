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
import * as parser from 'xml2json';
import { PayByTokenDto } from '../payments/dto/payByToken.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';
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

interface IPayByToken {
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
        processing_id: String(paymentRefFromHumo),
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
      const amountWidth100 = +payment.amount * 100;
      const xml = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-
      ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema -
      instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ebppif1="urn:PaymentServer">
      <SOAP-ENV:Body>
      <ebppif1:Payment>
      <language>en</language>
      <billerRef>SOAP_DMS</billerRef>
      <payinstrRef>SOAP_DMS</payinstrRef>
      <sessionID>SOAP_DMS_20220106090000</sessionID>
      <paymentRef>${payment.id}</paymentRef>
      <details>
      <item>
      <name>pan</name>
      <value>${pan}</value>
      </item>
      <item>
      <name>expiry</name>
      <value>${expiry}</value>
      </item>
      <item>
      <name>ccy_code</name>
      <value>860</value>
      </item>
      <item>
      <name>amount</name>
      <value>${amountWidth100}</value>
      </item>
      <item>
      <name>merchant_id</name>
      <value>${epos.merchant_id}</value>
      </item>
      <item>
      <name>terminal_id</name>
      <value>${epos.terminal_id}</value>
      </item>
      <item>
      <name>point_code</name>
      <value>${this.humoSoapPointCode}</value>
      </item>
      <item>
      <name>centre_id</name>
      <value>${this.humoSoapCenterId}</value>
      </item>
      </details>
      <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
      </ebppif1:Payment>
      </SOAP-ENV:Body>
      </SOAP-ENV:Envelope>`;

      const jsonData: any = await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
      console.log('RESPONSE FROM HOLD REQUEST HUMO: ', jsonData.data);
      const jsonfromXml = parser.toJson(jsonData.data);
      const json =
        JSON.parse(jsonfromXml)['SOAP-ENV:Envelope']['SOAP-ENV:Body'][
          'ebppif1:PaymentResponse'
        ];
      const paymentID = json.paymentID;
      const paymentRef = json.paymentRef;
      const action = json.action;

      if (action != 4) {
        throw new BadRequestException(
          'Fail. Check your credentials and try again',
        );
      }
      return {
        paymentIdFromHumo: paymentID,
        paymentRefFromHumo: paymentRef,
      };
    } catch (error) {
      console.log(
        'Error holding payment ' + error.message || error.response.data,
      );
      throw new Error('Error holding payment ');
    }
  }

  async confirmPaymentHumo(
    paymentIDFromHumo: string | number,
    paymentRefFromHumo: string | number,
  ) {
    try {
      const xml = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-
      ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-
      instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ebppif1="urn:PaymentServer">
      <SOAP-ENV:Body>
      <ebppif1:Payment>
      <paymentID>${paymentIDFromHumo}</paymentID>
      <paymentRef>${paymentRefFromHumo}</paymentRef>
      <confirmed>true</confirmed>
      <finished>true</finished>
      <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
      </ebppif1:Payment>
      </SOAP-ENV:Body>
      </SOAP-ENV:Envelope>`;

      const response = await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
      console.log('HUMO CONFIRM PAYMENT RESPONSE: ', response.data);

      const jsonData = parser.toJson(response.data);
      const json = JSON.parse(jsonData);
      const action =
        json['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ebppif1:PaymentResponse']
          .action;
      if (action != 10) {
        throw new BadRequestException(
          'Fail. Check your credentials and try again',
        );
      }

      return;
    } catch (error) {
      console.log(
        'Error confirming payment ' + error.message || error.response.data,
      );
      throw new Error('Error confirming payment ');
    }
  }

  async refund(payment: payment) {
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
      const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:urn="urn:PaymentServer">
      <soapenv:Header/>
      <soapenv:Body>
      <urn:ReturnPayment>
      <paymentRef>${String(payment.processing_id)}</paymentRef>
      <item>
      <name>merchant_id</name>
      <value>${epos.merchant_id}</value>
      </item>
      <item>
      <name>centre_id</name>
      <value>${this.humoSoapCenterId}</value>
      </item>
      <item>
      <name>terminal_id</name>
      <value>${epos.terminal_id}</value>
      </item>
      <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
      </urn:ReturnPayment>
      </soapenv:Body>
      </soapenv:Envelope>`;

      await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          refunded: true,
        },
      });
      return;
    } catch (error) {
      console.log(error);
      throw new Error('Error refunding payment');
    }
  }

  async payByToken(dto: PayByTokenDto, req: MyReq): Promise<IPayByToken> {
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: dto.Token,
      },
    });
    const payment = await this.prisma.payment.create({
      data: {
        amount: dto.Amount,
        currency: dto.Currency,
        invoice_id: String(dto.InvoiceId),
        account_id: String(dto.AccountId),
        description: dto.Description,
        card_info_id: cardInfo.id,
        cashbox_id: req.cashboxId,
        ip_address: req.ip,
        card_cryptogram_packet: cardInfo.card_cryptogram_packet,
      },
    });
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
    const { paymentIdFromHumo, paymentRefFromHumo } =
      await this.holdRequest(payment);
    await this.confirmPaymentHumo(paymentIdFromHumo, paymentRefFromHumo);
    const { pan, expiry } = this.decrypService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const { nameOnCard } = await this.getDataByPan(pan);
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        processing: 'humo',
        status: 'Completed',
        processing_id: String(paymentRefFromHumo),
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
}
