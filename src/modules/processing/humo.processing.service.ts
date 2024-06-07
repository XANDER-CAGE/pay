import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecryptService } from '../decrypt/decrypt.service';
import axios from 'axios';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import { IValidate } from './interfaces/validate.interface';
import { CardType } from 'src/common/enum/cardType.enum';
import * as crypto from 'crypto';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { IHandle3ds } from './interfaces/handle3ds.interface';
import * as parser from 'xml2json';
import { cashbox, epos, payment } from '@prisma/client';
import { IHold } from './interfaces/hold.interface';
import { IPayByToken } from './interfaces/payByToken.interface';
import { NotificationService } from '../notification/notification.service';
import { IConfirmHoldResponse } from './interfaces/confirmHoldResponse.interface';

interface IGetDataByPan {
  phone: string;
  fullname: string;
  expiry: string;
  balance: string;
}

interface IAuthAmountResponse {
  success: boolean;
  errorCode: number;
  paymentIdFromHumo: string;
  paymentRefFromHumo: string;
}

interface IAuthAmount {
  epos: epos;
  payment: payment;
  pan: string;
  expiry: string;
}

interface IConfirmHold {
  payment: payment;
  amount: number;
}

@Injectable()
export class HumoProcessingService {
  private readonly humoSoapUrl: string;
  private readonly humoSoapUsername: string;
  private readonly humoSoapPassword: string;
  private readonly humoSoapCenterId: string;
  private readonly humoSoapPointCode: string;
  private readonly humoMiddlewareToken: string;
  private readonly humoMiddlewareUrl: string;

  constructor(
    private readonly notificationService: NotificationService,
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

  async sendOtp(
    pan: string,
    cardId: number,
    cashbox: cashbox,
  ): Promise<ISendOtp> {
    const { phone } = await this.getDataByPan(pan);
    let otpCode = '';
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    otpCode += firstDigit.toString();
    for (let i = 0; i < 5; i++) {
      const digit = Math.floor(Math.random() * 10).toString();
      otpCode += digit;
    }
    const hashedOtp = crypto.createHash('md5').update(otpCode).digest('hex');
    const message = `Global Pay: ваш код подтверждения в ${cashbox.name} ${otpCode}`;
    await this.notificationService.send(phone, message);
    const otp = await this.prisma.otp.upsert({
      where: { card_id: cardId },
      create: {
        card_id: cardId,
        hashed_otp: hashedOtp,
      },
      update: {
        hashed_otp: hashedOtp,
        updated_at: new Date(),
      },
    });
    return {
      otpId: String(otp.id),
      phone,
    };
  }

  async getDataByPan(pan: string): Promise<IGetDataByPan> {
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
  }

  async validate(
    smsCode: string,
    otpId: string,
    pan: string,
  ): Promise<IValidate> {
    const otp = await this.prisma.otp.findFirst({
      where: { id: +otpId },
    });
    const { expiry, fullname, phone } = await this.getDataByPan(pan);
    const cardToken = crypto
      .createHash('md5')
      .update(`${pan}@${expiry}`)
      .digest('hex');
    const hashedOtp = crypto.createHash('md5').update(smsCode).digest('hex');
    if (otp.hashed_otp != hashedOtp) {
      return {
        success: false,
        cardData: {
          bankName: 'humo',
          cardToken,
          cardType: CardType.HUMO,
          fullname,
          pan,
          phone,
        },
      };
    }
    return {
      success: true,
      cardData: {
        cardType: CardType.HUMO,
        fullname,
        pan,
        phone,
        cardToken,
        bankName: 'Humo',
      },
    };
  }

  async handle3dsPost(obj: IHandle3ds): Promise<CoreApiResponse> {
    const { card, cashbox, expiry, ip, pan, payment } = obj;
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: cashbox.id,
        processing: 'humo',
        is_active: true,
        is_recurrent: false,
      },
    });
    if (!epos) {
      throw new NotFoundException('EPOS not found');
    }
    const { balance, phone } = await this.getDataByPan(pan);
    const { success, errorCode, paymentIdFromHumo, paymentRefFromHumo } =
      await this.authAmount({ epos, expiry, pan, payment });
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: expiry,
      CardType: card.processing,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: card.bank_name,
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };
    let model: CoreApiResponse;
    if (!success) {
      if (errorCode == 116) {
        model = CoreApiResponse.insufficentFunds(data);
      } else {
        model = CoreApiResponse.doNotHonor(data);
      }
      await this.prisma.payment.update({
        where: {
          id: obj.payment.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(paymentRefFromHumo),
          last_amount: +balance / 100,
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          updated_at: new Date(),
        },
      });
      return model;
    }

    const resultFromConfirm = await this.confirmAuthedAmount(
      paymentIdFromHumo,
      paymentRefFromHumo,
    );
    if (!resultFromConfirm.success) {
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(paymentRefFromHumo),
          last_amount: +balance / 100,
          fail_reason: 'DoNotHonor',
          reason_code: 5005,
          updated_at: new Date(),
        },
      });
    }
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Completed',
        processing_ref_num: String(paymentRefFromHumo),
        last_amount: +balance / 100,
        reason_code: 0,
        card: {
          update: {
            data: { status: 'Approved', updated_at: new Date() },
          },
        },
        updated_at: new Date(),
      },
    });
    this.notificationService.sendSuccessSms({
      amount: Number(obj.payment.amount),
      balance,
      cashboxName: obj.cashbox.name,
      pan: obj.pan,
      phone,
      processing: 'humo',
    });
    return CoreApiResponse.success(data);
  }

  private async authAmount(obj: IAuthAmount): Promise<IAuthAmountResponse> {
    const amountInTiyin = +obj.payment.amount * 100;
    const xml = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-
    ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema -
    instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ebppif1="urn:PaymentServer">
    <SOAP-ENV:Body>
    <ebppif1:Payment>
    <language>en</language>
    <billerRef>SOAP_DMS</billerRef>
    <payinstrRef>SOAP_DMS</payinstrRef>
    <sessionID>SOAP_DMS_20220106090000</sessionID>
    <paymentRef>${obj.payment.id}</paymentRef>
    <details>
    <item>
    <name>pan</name>
    <value>${obj.pan}</value>
    </item>
    <item>
    <name>expiry</name>
    <value>${obj.expiry}</value>
    </item>
    <item>
    <name>ccy_code</name>
    <value>860</value>
    </item>
    <item>
    <name>amount</name>
    <value>${amountInTiyin}</value>
    </item>
    <item>
    <name>merchant_id</name>
    <value>${obj.epos.merchant_id}</value>
    </item>
    <item>
    <name>terminal_id</name>
    <value>${obj.epos.terminal_id}</value>
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
        paymentIdFromHumo: '0',
        paymentRefFromHumo: '0',
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
      paymentIdFromHumo: String(paymentID),
      paymentRefFromHumo: String(paymentRef),
    };
  }

  private async confirmAuthedAmount(
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
      return {
        success: false,
        message: error.message,
      };
    }
    const jsonFromXml = parser.toJson(responseFromHumo.data);
    const json = JSON.parse(jsonFromXml);
    const action =
      json['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ebppif1:PaymentResponse']
        .action;
    if (action != 10) {
      return {
        success: false,
        message: 'Fail. Check your credentials and try again',
      };
    }
    return {
      success: true,
      message: null,
    };
  }

  async hold(holdData: IHold): Promise<CoreApiResponse> {
    const { pan, payment, expiry, card, cashbox, ip } = holdData;
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: cashbox.id,
        processing: 'humo',
        is_active: true,
        is_recurrent: true,
      },
    });
    const { balance } = await this.getDataByPan(pan);
    const { errorCode, paymentRefFromHumo, success, paymentIdFromHumo } =
      await this.authAmount({ epos, expiry, pan, payment });
    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: expiry,
      CardType: CardType.HUMO,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: 'humo',
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.masked_pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };
    let model: CoreApiResponse;
    if (!success) {
      if (errorCode == 116) {
        model = CoreApiResponse.insufficentFunds(data);
      } else {
        model = CoreApiResponse.doNotHonor(data);
      }
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(paymentRefFromHumo),
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          last_amount: +balance / 100,
          updated_at: new Date(),
        },
      });
      return model;
    }
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Authorized',
        processing_ref_num: String(paymentRefFromHumo),
        hold_id: paymentIdFromHumo,
        last_amount: +balance / 100,
        updated_at: new Date(),
      },
    });
    return CoreApiResponse.hold(data);
  }

  async confirmHold(data: IConfirmHold): Promise<IConfirmHoldResponse> {
    const amountInTiyin = data.amount * 100;
    const xml = `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-
      ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema -
      instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ebppif1="urn:PaymentServer">
      <SOAP-ENV:Body>
      <ebppif1:Payment>
      <paymentID>${data.payment.hold_id}</paymentID>
      <paymentRef>${data.payment.processing_ref_num}</paymentRef>
      <details>
      <item>
      <name>amount</name>
      <value>${amountInTiyin}</value>
      </item>
      </details>
      <confirmed>true</confirmed>
      <finished>true</finished>
      <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
      </ebppif1:Payment>
      </SOAP-ENV:Body>
      </SOAP-ENV:Envelope>`;
    try {
      await axios.post(this.humoSoapUrl, xml, {
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
      return {
        Success: false,
        Message: 'Error confirming payment',
      };
    }
    await this.prisma.payment.update({
      where: {
        id: data.payment.id,
        amount: data.amount,
      },
      data: {
        status: 'Completed',
        updated_at: new Date(),
      },
    });
    return {
      Success: true,
      Message: null,
    };
  }

  async cancelHold(payment: payment) {
    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:urn="urn:PaymentServer">
    <soapenv:Header/>
    <soapenv:Body>
    <urn:CancelRequest>
    <paymentRef>${payment.processing_ref_num}</paymentRef>>
    <paymentOriginator>${this.humoSoapUsername}</paymentOriginator>
    </urn:CancelRequest>
    </soapenv:Body>
    </soapenv:Envelope>`;
    try {
      await axios.post(this.humoSoapUrl, xml, {
        headers: {
          'Content-Type': 'text/xml',
        },
        auth: {
          username: this.humoSoapUsername,
          password: this.humoSoapPassword,
        },
      });
    } catch (error) {
      return {
        Success: false,
        Message: 'Cannot cancel: Something went wrong',
      };
    }
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Cancelled',
        updated_at: new Date(),
      },
    });
    return {
      Success: true,
      Message: null,
    };
  }

  async refund(payment: payment) {
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: payment.cashbox_id,
        processing: 'humo',
      },
    });
    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:urn="urn:PaymentServer">
    <soapenv:Header/>
    <soapenv:Body>
    <urn:ReturnPayment>
    <paymentRef>${payment.processing_ref_num}</paymentRef>
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
        refunded_date: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async payByToken(dto: IPayByToken): Promise<CoreApiResponse> {
    const { pan, cashbox, payment, expiry, ip, card } = dto;
    const { balance, phone } = await this.getDataByPan(pan);
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: cashbox.id,
        processing: 'humo',
        is_active: true,
        is_recurrent: true,
      },
    });
    const { success, errorCode, paymentIdFromHumo, paymentRefFromHumo } =
      await this.authAmount({ epos, expiry, pan, payment });

    const data = {
      AccountId: payment.account_id,
      Amount: Number(payment.amount),
      CardExpDate: expiry,
      CardType: CardType.HUMO,
      Date: payment.created_at,
      Description: payment.description,
      GatewayName: 'humo',
      InvoiceId: payment.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: payment.id,
    };
    let model: CoreApiResponse;
    if (!success) {
      if (errorCode == 116) {
        model = CoreApiResponse.insufficentFunds(data);
      } else {
        model = CoreApiResponse.doNotHonor(data);
      }
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(paymentRefFromHumo),
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          last_amount: +balance / 100,
          updated_at: new Date(),
        },
      });
      return model;
    }

    const resFromConfirm = await this.confirmAuthedAmount(
      paymentIdFromHumo,
      paymentRefFromHumo,
    );
    if (!resFromConfirm.success) {
      model = CoreApiResponse.doNotHonor(data);
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(paymentRefFromHumo),
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          last_amount: +balance / 100,
          updated_at: new Date(),
        },
      });
      return model;
    }
    await this.prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Completed',
        processing_ref_num: String(paymentRefFromHumo),
        reason_code: 0,
        last_amount: +balance / 100,
        updated_at: new Date(),
      },
    });
    this.notificationService.sendSuccessSms({
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
