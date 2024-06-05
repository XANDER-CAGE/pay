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
import { CoreApiResponse } from 'src/common/classes/model.class';
interface IGetDataByPan {
  phone: string;
  fullname: string;
  expiry: string;
  balance: string;
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
  success: boolean;
  errorCode: number;
  paymentIdFromHumo: string | number;
  paymentRefFromHumo: string | number;
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

  async getDataByPan(pan: string): Promise<IGetDataByPan> {
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
        fullname: data.result.card.nameOnCard,
        expiry: data.result.card.expiry,
        balance: data.result.balance.availableAmount,
      };
    } catch (error) {
      throw new Error('Error retrieving phone by pan');
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
    const { expiry, fullname, phone } = await this.getDataByPan(pan);

    const cardId = crypto
      .createHash('md5')
      .update(`${pan}@${expiry}`)
      .digest('hex');

    return {
      cardType: CardType.HUMO,
      expiry,
      fullName: fullname,
      pan,
      phone,
      processingId: cardId,
    };
  }

  async handle3dsPost(payment: payment): Promise<CoreApiResponse> {
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
    const { pan } = this.decrypService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const { balance, phone } = await this.getDataByPan(pan);
    const panRef = crypto.createHash('md5').update(pan).digest('hex');
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        pan_ref: panRef,
        account_id: payment.account_id,
      },
    });
    const { success, errorCode, paymentIdFromHumo, paymentRefFromHumo } =
      await this.holdRequest(payment);
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: cardInfo.expiry,
      CardType: cardInfo.card_type,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: 'humo',
      InvoiceId: payment.invoice_id,
      IpAddress: payment.ip_address,
      IpCity: payment.ip_city,
      IpCountry: payment.ip_country,
      IpRegion: payment.ip_region,
      Name: cardInfo.fullname,
      Pan: pan,
      PublicId: cashbox.public_id,
      Token: cardInfo.tk,
      TransactionId: payment.id,
    };
    if (!success) {
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          processing: 'humo',
          status: 'Declined',
          processing_id: String(paymentRefFromHumo),
          card_info_id: cardInfo.id,
          last_amount: balance,
        },
      });
      if (errorCode == 116) {
        return CoreApiResponse.insufficentFunds(data);
      } else {
        return CoreApiResponse.doNotHonor(data);
      }
    }

    await this.confirmPaymentHumo(paymentIdFromHumo, paymentRefFromHumo);
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        processing: 'humo',
        status: 'Completed',
        processing_id: String(paymentRefFromHumo),
        card_info_id: cardInfo.id,
        last_amount: balance,
      },
    });
    await this.smsSender.sendSuccessSms({
      amount: Number(payment.amount),
      balance,
      cashboxName: cashbox.name,
      pan,
      phone,
      processing: 'humo',
    });
    return CoreApiResponse.success(data);
  }

  private async holdRequest(payment: payment): Promise<IHoldRequest> {
    let epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: payment.cashbox_id,
        type: 'humo',
        is_recurrent: true,
      },
    });
    if (!epos) {
      epos = await this.prisma.epos.findFirst({
        where: {
          cashbox_id: payment.cashbox_id,
          type: 'humo',
          is_recurrent: false,
        },
      });
    }
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
    let responseFromHumo: any;
    try {
      responseFromHumo = await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
    } catch (error) {
      responseFromHumo = error.response?.data;
      const jsonfromXml = parser.toJson(responseFromHumo);
      const json = JSON.parse(jsonfromXml);
      const errorCode =
        json['SOAP-ENV:Envelope']?.['SOAP-ENV:Body']?.['SOAP-ENV:Fault']?.[
          'detail'
        ]?.['ebppif1:PaymentServerException']?.['error'];

      return {
        success: false,
        errorCode,
        paymentIdFromHumo: 0,
        paymentRefFromHumo: 0,
      };
    }
    const jsonfromXml = parser.toJson(responseFromHumo.data);
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
      success: true,
      errorCode: null,
      paymentIdFromHumo: paymentID,
      paymentRefFromHumo: paymentRef,
    };
  }

  private async confirmPaymentHumo(
    paymentIDFromHumo: string | number,
    paymentRefFromHumo: string | number,
  ) {
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
    let responseFromHumo: any;
    try {
      responseFromHumo = await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
    } catch (error) {
      console.log('Error confirming payment ', error.response.data);
      throw new Error('Error confirming payment ');
    }
    const jsonFromXml = parser.toJson(responseFromHumo.data);
    const json = JSON.parse(jsonFromXml);
    const action =
      json['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ebppif1:PaymentResponse']
        .action;
    if (action != 10) {
      throw new BadRequestException(
        'Fail. Check your credentials and try again',
      );
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
      throw new Error('Error refunding payment');
    }
  }

  async payByToken(dto: PayByTokenDto, req: MyReq): Promise<CoreApiResponse> {
    const cardInfo = await this.prisma.card_info.findFirst({
      where: {
        tk: dto.Token,
      },
    });
    const { pan } = this.decrypService.decryptCardCryptogram(
      cardInfo.card_cryptogram_packet,
    );
    const { balance, phone } = await this.getDataByPan(pan);
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
        last_amount: balance,
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
    // const { nameOnCard, phone } = await this.getDataByPan(pan);
    const { success, errorCode, paymentIdFromHumo, paymentRefFromHumo } =
      await this.holdRequest(payment);

    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: cardInfo.expiry,
      CardType: cardInfo.card_type,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: 'humo',
      InvoiceId: payment.invoice_id,
      IpAddress: payment.ip_address,
      IpCity: payment.ip_city,
      IpCountry: payment.ip_country,
      IpRegion: payment.ip_region,
      Name: cardInfo.fullname,
      Pan: pan,
      PublicId: cashbox.public_id,
      Token: cardInfo.tk,
      TransactionId: payment.id,
    };
    // 000 Утверждено
    // 001 Утверждено, честь с идентификацией
    // 100 Отклонение (общее, без комментариев)
    // 101 Отклонить, просроченная карта
    // 102 Снижение, подозрение на мошенничество
    // 106 Отклонено, допустимые попытки ПИН превышены
    // 107 Отклонить, обратитесь к эмитенту карты
    // 108 Отклонить, см. Особые условия эмитента карты
    // 109 Отклонить, недействительный продавец
    // 110 Отклонение, недействительная сумма
    // 111 Отклонение, неверный номер карты
    // 116 Отклонение, недостаточно средств
    // 118 Карта не существует
    // 120 Отклонить, транзакция не разрешена к терминалу
    // 125 отклонено, карта не действует
    // 206 Отклонено, карта в блоке (допустимые попытки ПИН превышены)
    // 208 Отклонено, карта в блоке (потерянная карта)
    // 209 Отклонено, карта в блоке (украденная карточка)
    // 500 Статус сообщения: согласовано, в балансе
    // 501 Сообщение о состоянии: согласовано, не сбалансированно
    // 502 Статусное сообщение: сумма не сверена, итоги предоставлены
    // 503 Статусное сообщение: итоги для сверки недоступны
    // 504 Сообщение о состоянии: не согласовано, итоги предоставлены
    // 904 Сообщение о причине отклонения: ошибка формата
    // 915 Сообщение о причине отклонения: ошибка переключения или контрольной
    // точки
    // 916 Сообщение о причине отклонения: MAC неверный
    if (!success) {
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          processing: 'humo',
          status: 'Declined',
          processing_id: String(paymentRefFromHumo),
        },
      });
      if (errorCode == 116) {
        return CoreApiResponse.insufficentFunds(data);
      } else {
        return CoreApiResponse.doNotHonor(data);
      }
    }

    await this.confirmPaymentHumo(paymentIdFromHumo, paymentRefFromHumo);
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
    await this.smsSender.sendSuccessSms({
      amount: Number(payment.amount),
      balance,
      pan,
      phone,
      cashboxName: cashbox.name,
      processing: 'humo',
    });
    return CoreApiResponse.success(data);
  }

  async getDataByTransactionId(processingId: string) {
    try {
      const xml = `
      <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-
      ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-
      instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ebppif1="urn:PaymentServer">
      <SOAP-ENV:Body>
      <ebppif1:GetPayment>
      <paymentRef>${processingId}</paymentRef>
      <sessionID/>
      <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
      </ebppif1:GetPayment>
      </SOAP-ENV:Body>
      </SOAP-ENV:Envelope>
      `;
      const response = await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
