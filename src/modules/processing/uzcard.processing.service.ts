import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ISendOtp } from './interfaces/sendOtpResponse.interface';
import axios from 'axios';
import { IValidate } from './interfaces/validate.interface';
import { CardType } from 'src/common/enum/cardType.enum';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { IHandle3ds } from './interfaces/handle3ds.interface';
import { IHold } from './interfaces/hold.interface';
import { cashbox, transaction } from '@prisma/client';
import { IPayByToken } from './interfaces/payByToken.interface';
import { NotificationService } from '../notification/notification.service';
import { IConfirmHoldResponse } from './interfaces/confirmHoldResponse.interface';

interface IGetDataByToken {
  fullname: string;
  phone: string;
  balance: string;
}

interface IConfirmHold {
  cashbox: cashbox;
  transaction: transaction;
  amount: number;
}

@Injectable()
export class UzcardProcessingService {
  private readonly uzCardUrl: string;
  private readonly uzCardLogin: string;
  private readonly uzCardPassword: string;
  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {
    this.uzCardLogin = process.env.UZCARD_LOGIN;
    this.uzCardPassword = process.env.UZCARD_PASSWORD;
    this.uzCardUrl = process.env.UZCARD_API_URL;
  }

  async sendOtp(
    pan: string,
    expiry: string,
    cardId: number,
  ): Promise<ISendOtp> {
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
    await this.prisma.otp.upsert({
      where: { card_id: cardId },
      create: {
        hashed_otp: 'uzcard',
        card_id: cardId,
      },
      update: {
        updated_at: new Date(),
      },
    });
    return { otpId, phone };
  }

  async validate(otpId: string, smsCode: string): Promise<IValidate> {
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
      return {
        success: false,
        cardData: {
          cardToken: null,
          pan: null,
          phone: null,
          fullname: null,
          cardType: CardType.UZCARD,
          bankName: 'UzCard',
        },
      };
    }
    const cardData = response.data.result;
    return {
      success: true,
      cardData: {
        cardToken: cardData.id,
        pan: cardData.pan,
        phone: cardData.phone,
        fullname: cardData.fullName,
        cardType: CardType.UZCARD,
        bankName: 'UzCard',
      },
    };
  }

  async handle3dsPost(obj: IHandle3ds): Promise<CoreApiResponse> {
    const { card, company, transaction, expiry, ip, cashbox } = obj;
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: cashbox.id,
        processing: 'uzcard',
      },
    });
    if (!epos) {
      throw new NotFoundException('EPOS not found');
    }
    const { balance, phone } = await this.getDataByProcessingCardToken(
      card.processing_card_token,
    );
    const amountInTiyin = +obj.transaction.amount * 100;
    const requestData = {
      id: 1,
      jsonrpc: '2.0',
      method: 'trans.pay.purpose',
      params: {
        tran: {
          purpose: 'payment',
          receiverId: company.account_id, // Эти данные нужно определить или получить
          cardId: card.processing_card_token, // Используем cardId из данных платежа
          amount: amountInTiyin, // Используем сумму платежа
          comission: 0,
          currency: '860', // Валюта платежа
          ext: transaction.invoice_id, // Дополнительная информация, если нужна
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
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: expiry,
      CardType: card.processing,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: card.bank_name,
      InvoiceId: transaction.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: obj.ip.city,
      IpCountry: obj.ip.country,
      IpRegion: obj.ip.region,
      Name: card.fullname,
      Pan: card.pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: obj.transaction.id,
    };
    let model: CoreApiResponse;
    const failReason = response.data?.error?.message;
    const statusIsOK = response.data?.result?.status == 'OK';
    const errorCode = response.data?.result?.resp;
    const refNum = response.data?.result?.refNum;
    const refNumExists = refNum && refNum != '000000000000';
    if (failReason || !refNumExists || !statusIsOK) {
      if (errorCode == 51) {
        model = CoreApiResponse.insufficentFunds(data);
      } else {
        model = CoreApiResponse.doNotHonor(data);
      }
      await this.prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: refNum,
          card_id: card.id,
          last_amount: +balance / 100,
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          updated_at: new Date(),
        },
      });
      return model;
    }
    await this.prisma.transaction.update({
      where: {
        id: obj.transaction.id,
      },
      data: {
        status: 'Completed',
        processing_ref_num: refNum,
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
      amount: Number(obj.transaction.amount),
      balance,
      cashboxName: obj.cashbox.name,
      pan: obj.pan,
      phone,
      processing: 'uzcard',
    });
    return CoreApiResponse.success(data);
  }

  async getDataByProcessingCardToken(
    processingCardToken: string,
  ): Promise<IGetDataByToken> {
    const requestData = {
      jsonrpc: '2.0',
      method: 'cards.get',
      id: 123,
      params: {
        ids: [processingCardToken],
      },
    };
    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    const fullname = response.data?.result[0]?.fullName;
    const phone = response.data?.result[0]?.phone;
    const balance = response.data?.result[0]?.balance;
    return {
      fullname,
      phone,
      balance,
    };
  }

  async hold(dto: IHold): Promise<CoreApiResponse> {
    const { balance } = await this.getDataByProcessingCardToken(
      dto.card.processing_card_token,
    );
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: dto.cashbox.id,
        processing: 'uzcard',
      },
    });
    const amountInTiyin = +dto.transaction.amount * 100;
    const requestData = {
      jsonrpc: '2.0',
      method: 'hold.create',
      id: 1,
      params: {
        hold: {
          cardId: dto.card.processing_card_token,
          merchantId: epos.merchant_id,
          terminalId: epos.terminal_id,
          amount: amountInTiyin,
          time: 60 * 24 * 7,
        },
      },
    };
    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    const holdId = response?.data?.result?.id;
    const status = response?.data?.result?.status;
    const data = {
      AccountId: dto.transaction.account_id,
      Amount: Number(dto.transaction.amount),
      CardExpDate: dto.expiry,
      CardType: CardType.UZCARD,
      Date: dto.transaction.created_at,
      Description: dto.transaction.description,
      GatewayName: 'uzcard',
      InvoiceId: dto.transaction.invoice_id,
      IpAddress: dto.ip.ip_address,
      IpCity: dto.ip.city,
      IpCountry: dto.ip.country,
      IpRegion: dto.ip.region,
      Name: dto.card.fullname,
      Pan: dto.card.pan,
      PublicId: dto.cashbox.public_id,
      Token: dto.card.tk,
      TransactionId: dto.transaction.id,
    };
    if (holdId && status == 0) {
      await this.prisma.transaction.update({
        where: {
          id: dto.transaction.id,
        },
        data: {
          status: 'Authorized',
          processing_ref_num: String(holdId),
          hold_id: String(holdId),
          last_amount: +balance / 100,
          updated_at: new Date(),
        },
      });
      return CoreApiResponse.hold(data);
    }
    await this.prisma.transaction.update({
      where: {
        id: dto.transaction.id,
      },
      data: {
        status: 'Declined',
        processing_ref_num: String(0),
        last_amount: +balance / 100,
        updated_at: new Date(),
      },
    });
    return CoreApiResponse.doNotHonor(data);
  }

  async confirmHold(dto: IConfirmHold): Promise<IConfirmHoldResponse> {
    const { transaction, cashbox } = dto;
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: cashbox.id,
        processing: 'uzcard',
      },
    });
    const requestData = {
      jsonrpc: '2.0',
      method: 'hold.dismiss.charge',
      id: 1323,
      params: {
        hold: {
          holdId: transaction.hold_id,
          ext: transaction.id,
          merchantId: epos.merchant_id,
          port: '123456',
          terminalId: epos.terminal_id,
          stan: '123456',
          amount: +dto.amount * 100,
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
    const statusIsOK = response.data?.result?.status == 'OK';
    const refNum = response.data?.result?.refNum;
    const refNumExists = refNum && refNum != '000000000000';
    if (failReason || !refNumExists || !statusIsOK) {
      return { Success: false, Message: failReason || null };
    }
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        amount: dto.amount,
        status: 'Completed',
        processing_ref_num: String(response.data?.result?.refNum),
        updated_at: new Date(),
      },
    });
    return { Success: true, Message: null };
  }

  async cancelHold(transaction: transaction) {
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: transaction.cashbox_id,
        processing: 'uzcard',
      },
    });

    const requestData = {
      jsonrpc: '2.0',
      method: 'hold.dismiss',
      id: 2,
      params: {
        hold: {
          holdId: transaction.hold_id,
          merchantId: epos.merchant_id,
          terminalId: epos.terminal_id,
          amount: +transaction.amount * 100,
        },
      },
    };
    const response = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    const status = response?.data?.result?.status;
    if (status != 0) {
      return { Success: false, Message: null };
    }
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'Cancelled', updated_at: new Date() },
    });
    return { Success: true, Message: null };
  }

  async refund(transaction: transaction) {
    const requestData = {
      jsonrpc: '2.0',
      method: 'trans.reverse',
      id: 123,
      params: {
        tranId: transaction.processing_ref_num,
      },
    };
    const { data } = await axios.post(this.uzCardUrl, requestData, {
      auth: {
        username: this.uzCardLogin,
        password: this.uzCardPassword,
      },
    });
    if (data.result[0]?.status == 'RER') {
      throw new Error('Something went wrong: ' + data.result[0]?.respText);
    }
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        refunded_date: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async payByToken(dto: IPayByToken): Promise<CoreApiResponse> {
    const { card, transaction, company, expiry, ip, cashbox } = dto;
    const { balance, phone } = await this.getDataByProcessingCardToken(
      card.processing_card_token,
    );
    const epos = await this.prisma.epos.findFirst({
      where: {
        cashbox_id: transaction.cashbox_id,
        processing: 'uzcard',
      },
    });
    if (!epos) {
      throw new NotFoundException('Epos not found');
    }
    const amountInTiyin = +transaction.amount * 100;
    const requestData = {
      id: 1,
      jsonrpc: '2.0',
      method: 'trans.pay.purpose',
      params: {
        tran: {
          purpose: 'payment',
          receiverId: company.account_id, // Эти данные нужно определить или получить
          cardId: card.processing_card_token, // Используем cardId из данных платежа
          amount: amountInTiyin, // Используем сумму платежа
          comission: 0,
          //commission: cashbox.commission, // Указываем комиссию, если она известна
          currency: '860', // Валюта платежа
          ext: transaction.invoice_id, // Дополнительная информация, если нужна
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
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: expiry,
      CardType: CardType.UZCARD,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: 'uzcard',
      InvoiceId: transaction.invoice_id,
      IpAddress: ip.ip_address,
      IpCity: ip.city,
      IpCountry: ip.country,
      IpRegion: ip.region,
      Name: card.fullname,
      Pan: card.pan,
      PublicId: cashbox.public_id,
      Token: card.tk,
      TransactionId: transaction.id,
    };
    let model: CoreApiResponse;
    const failReason = response.data?.error?.message;
    const statusIsOK = response.data?.result?.status == 'OK';
    const refNum = response.data?.result?.refNum;
    const errorCode = response.data?.result?.resp;
    const refNumExists = refNum && refNum != '000000000000';
    if (failReason || !refNumExists || !statusIsOK) {
      if (errorCode == 51) {
        model = CoreApiResponse.insufficentFunds(data);
      } else {
        model = CoreApiResponse.doNotHonor(data);
      }
      await this.prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          status: 'Declined',
          processing_ref_num: String(response.data?.result?.refNum),
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          last_amount: +balance / 100,
          updated_at: new Date(),
        },
      });
      return model;
    }
    await this.prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        status: 'Completed',
        processing_ref_num: String(response.data?.result?.refNum),
        reason_code: 0,
        last_amount: +balance / 100,
      },
    });
    this.notificationService.sendSuccessSms({
      amount: Number(transaction.amount),
      balance,
      cashboxName: cashbox.name,
      pan: card.pan,
      phone,
      processing: 'uzcard',
    });
    return CoreApiResponse.success(data);
  }

  async getDataByTransactionId(processingId: string) {
    try {
      const requestData = {
        jsonrpc: '2.0',
        method: 'trans.ext',
        id: 123,
        params: {
          extId: processingId,
        },
      };
      const response = await axios.post(this.uzCardUrl, requestData, {
        auth: {
          username: this.uzCardLogin,
          password: this.uzCardPassword,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
