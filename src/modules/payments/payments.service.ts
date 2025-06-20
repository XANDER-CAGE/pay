import {
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { isObject } from 'lodash';
import { CoreApiResponse } from 'src/common/classes/model.class';
import {
  GetLocationUtil,
  getLocationSymbol,
} from 'src/common/utils/getGeoLocation.util';
import { CardsService } from '../cards/cards.service';
import { DecryptService } from '../decrypt/decrypt.service';
import { HookService } from '../hook/hook.service';
import { PrismaService } from '../prisma/prisma.service';
import { IConfirmHoldResponse } from '../processing/interfaces/confirmHoldResponse.interface';
import { ProcessingService } from '../processing/processing.service';
import { ConfirmHoldDto } from './dto/confirmHold.dto';
import { Handle3dsPostDto } from './dto/handle3dsPost.dto';
import { RefundDto } from './dto/refund.dto';
import { PaymentsTESTService } from './payments.test.service';

type otp = {
  attempts: number;
  smsCode: string;
};
export const otps: Record<string, otp> = {};

interface ICardsChargeData {
  ip: string;
  cardCryptoGramPacket: string;
  amount: number;
  invoiceId: string;
  description: string;
  accountId: string;
  jsonData: object;
}

interface IHold {
  ip: string;
  amount: string;
  invoiceId: string;
  description: string;
  accountId: string;
  cashboxId: number;
  token: string;
  organizationId: number;
  jsonData?: object;
}

interface IPayByToken {
  ip: string;
  amount: string;
  invoiceId: string;
  description: string;
  accountId: string;
  cashboxId: number;
  token: string;
  organizationId: number;
  json_data?: object;
}

interface IP2P {
  senderToken: string;
  receiverPan: string;
  amount: string;
  cashboxId: number;
}

interface ICardsHold {
  ip: string;
  cardCryptoGramPacket: string;
  amount: number;
  invoiceId: string;
  description: string;
  accountId: string;
  jsonData: object;
}

@Injectable()
export class PaymentsService {
  private readonly cryptoPayTimeout: number;
  constructor(
    @Inject(getLocationSymbol)
    private readonly getLocationUtil: GetLocationUtil,
    private readonly decryptService: DecryptService,
    private readonly prisma: PrismaService,
    private readonly processingService: ProcessingService,
    private readonly cardService: CardsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly hookService: HookService,
    private readonly testService: PaymentsTESTService,
  ) {
    this.cryptoPayTimeout =
      Number(process.env.PAY_VIA_CRYPTO_TIMEOUT_IN_MINUTES) || 10;
  }

  async test() {
      const uuid = require('uuid').v4();
      return {
          "Success": true,
          "Message": uuid
      };
  }

  async getTransaction(transactionId: number, cashboxId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        cashbox_id: cashboxId,
      },
      include: {
        card: true,
        ip: true,
        cashbox: true,
      },
    });

    if (!transaction) {
      return {
        Success: false,
        Message: 'Transaction not found'
      };
    }

    const card = transaction.card;
    const ip = transaction.ip;
    const cashbox = transaction.cashbox;

    const model = {
      ReasonCode: transaction.reason_code || 0,
      PublicId: cashbox.public_id,
      TerminalUrl: 'https://pay.dnsc.uz',
      TransactionId: transaction.id,
      Amount: Number(transaction.amount),
      Currency: 'UZS',
      CurrencyCode: 860,
      PaymentAmount: Number(transaction.amount),
      PaymentCurrency: 'UZS',
      PaymentCurrencyCode: 860,
      InvoiceId: transaction.invoice_id,
      AccountId: transaction.account_id,
      Email: null,
      Description: transaction.description,
      JsonData: transaction.json_data,
      CreatedDate: `/Date(${transaction.created_at.getTime()})/`,
      CreatedDateIso: transaction.created_at.toISOString(),
      PayoutDate: null,
      PayoutDateIso: null,
      PayoutAmount: null,
      AuthDate: transaction.status === 'Authorized' || transaction.status === 'Completed' 
        ? `/Date(${transaction.created_at.getTime()})/` : null,
      AuthDateIso: transaction.status === 'Authorized' || transaction.status === 'Completed' 
        ? transaction.created_at.toISOString() : null,
      ConfirmDate: transaction.status === 'Completed' 
        ? `/Date(${transaction.updated_at.getTime()})/` : null,
      ConfirmDateIso: transaction.status === 'Completed' 
        ? transaction.updated_at.toISOString() : null,
      AuthCode: transaction.status === 'Authorized' || transaction.status === 'Completed' 
        ? 'A1B2C3' : null,
      TestMode: transaction.is_test,
      Rrn: null,
      OriginalTransactionId: null,
      FallBackScenarioDeclinedTransactionId: null,
      IpAddress: ip?.ip_address,
      IpCountry: ip?.country,
      IpCity: ip?.city,
      IpRegion: ip?.region,
      IpDistrict: ip?.regionName,
      IpLatitude: ip?.lat,
      IpLongitude: ip?.lon,
      CardFirstSix: card?.pan?.slice(0, 6),
      CardLastFour: card?.pan?.slice(-4),
      CardExpDate: card?.expiry,
      CardType: card?.processing,
      CardProduct: null,
      CardCategory: 'Не определен ()',
      EscrowAccumulationId: null,
      IssuerBankCountry: 'UZ',
      Issuer: card?.bank_name,
      CardTypeCode: 0,
      Status: transaction.status,
      StatusCode: this.getStatusCode(transaction.status),
      CultureName: 'uz',
      Reason: this.getReasonByCode(transaction.reason_code),
      CardHolderMessage: this.getCardHolderMessage(transaction.status, transaction.reason_code),
      Type: this.getTransactionType(transaction.type),
      Refunded: !!transaction.refunded_date,
      Name: card?.fullname,
      Token: card?.tk,
      SubscriptionId: null,
      GatewayName: card?.bank_name,
      AndroidPay: false,
      WalletType: '',
      TotalFee: 0,
    };

    return {
      Model: model,
      Success: true,
      Message: null
    };
  }

  async topupByCryptogram(data: any) {
    // Логика выплаты по криптограмме
    // Адаптируем под местные процессинги или банки
    throw new Error('Topup by cryptogram not implemented for local processing');
  }

  async topupByToken(data: any) {
    // Логика выплаты по токену
    // Адаптируем под местные процессинги или банки
    throw new Error('Topup by token not implemented for local processing');
  }

  private getStatusCode(status: string): number {
    const statusCodes = {
      'Authorized': 2,
      'Completed': 3,
      'Declined': 5,
      'Cancelled': 6,
      'Pending': 1,
      'AwaitingAuthentication': 1,
    };
    return statusCodes[status] || 0;
  }

  private getReasonByCode(reasonCode: number): string {
    const reasonCodes = {
      0: 'Approved',
      5051: 'InsufficientFunds',
      5015: 'No such issuer',
      5005: 'DoNotHonor',
      7000: 'Wrong cryptogram packet',
      5206: 'Authentication failed',
      5000: 'Transaction is processing',
      5057: 'Transaction Not Permitted',
      6002: 'InvalidErrorCode',
    };
    return reasonCodes[reasonCode] || 'Unknown';
  }

  private getCardHolderMessage(status: string, reasonCode: number): string {
    if (status === 'Completed') return 'Оплата успешно проведена';
    if (status === 'Authorized') return 'Холдирование успешно авторизован';
    if (reasonCode === 5051) return 'Недостаточно средств на карте';
    if (reasonCode === 5005) return 'Свяжитесь с вашим банком или воспользуйтесь другой картой';
    if (reasonCode === 5015) return 'Токен карты не найден';
    if (reasonCode === 5057) return 'карта заблокирована или еще не активирована';
    if (reasonCode === 5206) return '3-D Secure авторизация не пройдена';
    if (reasonCode === 7000) return 'Неправильная криптограмма';
    return 'Ошибка обработки платежа';
  }

  private getTransactionType(type: string): number {
    const types = {
      'threeds': 0,
      'recurrent': 0,
      'hold': 0,
      'credit': 2,
      'p2p': 2,
    };
    return types[type] || 0;
  }

  async charge(data: ICardsChargeData) {
    const { success: cryptoSuccess, decryptedData } =
      this.decryptService.decryptCardCryptogram(data.cardCryptoGramPacket);

    const currency = data.currency || 'UZS';
    const currencyCode = this.getCurrencyCode(currency);

    const order = await this.prisma.order.findFirst({
      where: { invoice_id: data.invoiceId },
    });

    if (order && order.amount != data.amount) {
      throw new NotAcceptableException('Different amount');
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { public_id: decryptedData.decryptedLogin, is_active: true },
    });
    if (!cashbox) {
      throw new NotFoundException('Cashbox not found');
    }
    const locationExists = await this.prisma.ip.findFirst({
      where: { ip_address: data.ip },
    });
    let ipId: number = locationExists?.id;
    if (!locationExists) {
      const location = await this.getLocationUtil.getLocationByIP(data.ip);
      const newLocation = await this.prisma.ip.create({
        data: {
          as: location.as,
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
          ip_address: data.ip,
          isp: location.isp,
          lat: location.lat,
          lon: location.lon,
          org: location.org,
          region: location.region,
          regionName: location.regionName,
          timezone: location.timezone,
          zip: location.zip,
        },
      });
      ipId = newLocation.id;
    }
    if (!cryptoSuccess) {
      const payment = await this.prisma.transaction.create({
        data: {
          amount: data.amount,
          currency: '860',
          invoice_id: data.invoiceId,
          ip_id: ipId,
          description: data.description,
          cashbox_id: cashbox.id,
          status: 'Declined',
          reason_code: 7000,
          type: 'threeds',
          account_id: data.accountId,
          fail_reason: 'Invalid cryptogram packet',
          json_data: data.jsonData,
        },
      });
      console.error({
        time: new Date(),
        payment,
        cryptogram: data.cardCryptoGramPacket,
        message: 'Invalid cryptogram packet',
      });
      return CoreApiResponse.wrongCryptogram();
    }
    const paymentWithInvoiceIdExists = await this.prisma.transaction.findFirst({
      where: { invoice_id: data.invoiceId, cashbox_id: cashbox.id },
    });
    if (paymentWithInvoiceIdExists) {
      return await this.find(data.invoiceId, cashbox.id);
    }
    const { success: cSuccess, data: cData } = await this.cardService.create({
      cashboxId: cashbox.id,
      cryptogram: data.cardCryptoGramPacket,
    });
    const isTest = decryptedData.pan.includes('000000000000');
    if (!cSuccess) {
      await this.prisma.transaction.create({
        data: {
          amount: data.amount,
          currency: '860',
          invoice_id: data.invoiceId,
          type: 'threeds',
          is_test: isTest,
          ip_id: ipId,
          description: data.description,
          card_id: cData.cardId,
          cashbox_id: cashbox.id,
          status: 'Declined',
          account_id: data.accountId,
          fail_reason: cData.Model.Reason,
          reason_code: cData.Model.ReasonCode,
          status_code: 13,
        },
      });
      return cData;
    }
    const payment = await this.prisma.transaction.create({
      data: {
        amount: data.amount,
        currency: '860',
        type: 'threeds',
        is_test: isTest,
        invoice_id: data.invoiceId,
        ip_id: ipId,
        description: data.description,
        card_id: cData.cardId,
        cashbox_id: cashbox.id,
        account_id: data.accountId,
        status: 'AwaitingAuthentication',
        json_data: order ? order.json_data : data.jsonData || null,
      },
    });
    this.cardChargeTimedOut(payment.id);
    const customData = {
      Currency: 'UZS',
      Amount: String(data.amount),
      Description: data.description || null,
      id: cData.otpId,
      phone: cData.phone,
    };
    const customDataEncoded = Buffer.from(JSON.stringify(customData)).toString(
      'base64',
    );
    // TODO review this return
    return {
      Model: {
        TransactionId: payment.id,
        PaReq: customDataEncoded,
        AcsUrl: process.env.CURRENT_API_URL + '/check_areq',
        ThreeDsCallbackId: '7be4d37f0a434c0a8a7fc0e328368d7d',
        IFrameIsAllowed: true,
      },
      Success: false, //special for jet merchant
      Message: null,
    };
  }

  private getCurrencyCode(currency: string): number {
    const currencyCodes = {
      'RUB': 643,
      'USD': 840,
      'EUR': 978,
      'GBP': 826,
      'UZS': 860
    };
    return currencyCodes[currency] || 860; // По умолчанию UZS
  }

  async handle3DSPost(dto: Handle3dsPostDto): Promise<CoreApiResponse> {
    //console.log('DTO', dto);
    const checkHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'check' },
    });

    if (checkHook) {
    const checkResult = await this.hookService.sendHook(
      checkHook.url,
      'check',
      cashbox.password_api, // или отдельное поле api_secret
      transaction,
      card,
      ip,
      transaction.json_data,
    );
    
    if (!checkResult.success || checkResult.code !== 0) {
      // Обработка отказа от check hook-а
      const model = CoreApiResponse.invalidErrorCode();
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'Declined',
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          status_code: checkResult.code,
        },
      });
      this.cancelCardChargeTimeout(transaction.id);
      return model;
    }
  }

    let transactionId;
    if (
      typeof dto.TransactionId === 'string' &&
      dto.TransactionId.trim().startsWith('{')
    ) {
      try {
        const parsedId = JSON.parse(dto.TransactionId);
        if (isObject(parsedId) && parsedId.TransactionId) {
          transactionId = +parsedId.TransactionId; // Преобразуем в число
        } else {
          throw new Error('Invalid TransactionId JSON structure');
        }
      } catch (error) {
        console.error('Ошибка при разборе TransactionId:', error);
        throw new NotFoundException('Invalid TransactionId format');
      }
    } else {
      transactionId = +dto.TransactionId;
    }
    console.log('TransactionID: ', transactionId);

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId },
      include: {
        cashbox: { include: { company: true, hook: true } },
        card: true,
        ip: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }
    if (transaction.status !== 'Authorized') {
      throw new NotAcceptableException('Transaction not authorized');
    }
    const cashbox = transaction.cashbox;
    const company = transaction.cashbox.company;
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    console.log('COMPANY', company);

    const ip = transaction.ip;
    const card = transaction.card;
    const isTest = card.processing_card_token == 'test';
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      card.cryptogram,
    );
    const checkHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'check' },
    });
    if (checkHook) {
      const res = await this.hookService.hook(
        checkHook.url,
        'Payment',
        transaction,
        card,
      );
      if (res.code != 0) {
        const model = CoreApiResponse.invalidErrorCode();
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'Declined',
            fail_reason: model.Model.Reason,
            reason_code: model.Model.ReasonCode,
            status_code: res.code,
          },
        });
        this.cancelCardChargeTimeout(transaction.id);
        return model;
      }
    }
    if (isTest) {
      const model = await this.testService.handle3dsTEST(
        transaction,
        card,
        ip,
        cashbox,
      );
      this.cancelCardChargeTimeout(transaction.id);
      return model;
    }
    const order = await this.prisma.order.findFirst({
      where: {
        invoice_id: transaction.invoice_id,
      },
    });
    if (order && order.status == 'Cancelled') {
      throw new NotAcceptableException('Order cancelled');
    }
    let model: CoreApiResponse;
    if ((order && order.require_confirmation) || transaction.type === 'hold') {
      model = await this.processingService.hold({
        card,
        cashbox,
        expiry: decryptedData.expiry,
        ip,
        pan: decryptedData.pan,
        transaction,
      });
    } else {
      model = await this.processingService.handle3dsPost({
        cashbox,
        company,
        pan: decryptedData.pan,
        transaction,
        expiry: decryptedData.expiry,
        ip,
        card,
      });
    }
    this.cancelCardChargeTimeout(transaction.id);
    const updatedPayment = await this.prisma.transaction.findFirst({
      where: { id: transaction.id },
      include: { card: true, ip: true, cashbox: true },
    });

    /*if (model.Success) {
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        this.hookService.hook(payHook.url, 'Payment', updatedPayment, card);
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        this.hookService.hook(failHook.url, 'Payment', updatedPayment, card);
      }
    }*/

    if (model.Success) {
      // Pay hook для успешного платежа
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        await this.hookService.sendHook(
          payHook.url,
          'pay',
          cashbox.password_api,
          updatedPayment,
          updatedPayment.card,
          updatedPayment.ip,
          updatedPayment.json_data,
        );
      }
    } else {
      // Fail hook для неуспешного платежа
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        await this.hookService.sendHook(
          failHook.url,
          'fail',
          cashbox.password_api,
          updatedPayment,
          updatedPayment.card,
          updatedPayment.ip,
          updatedPayment.json_data,
        );
      }
    }

    return model;
  }

  async cardsAuth(data: ICardsHold) {
    const { success: cryptoSuccess, decryptedData } =
      this.decryptService.decryptCardCryptogram(data.cardCryptoGramPacket);
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { public_id: decryptedData.decryptedLogin, is_active: true },
    });
    if (!cashbox) {
      throw new NotFoundException('Cashbox not found');
    }
    const locationExists = await this.prisma.ip.findFirst({
      where: { ip_address: data.ip },
    });
    let ipId: number = locationExists?.id;
    if (!locationExists) {
      const location = await this.getLocationUtil.getLocationByIP(data.ip);
      const newLocation = await this.prisma.ip.create({
        data: {
          as: location.as,
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
          ip_address: data.ip,
          isp: location.isp,
          lat: location.lat,
          lon: location.lon,
          org: location.org,
          region: location.region,
          regionName: location.regionName,
          timezone: location.timezone,
          zip: location.zip,
        },
      });
      ipId = newLocation.id;
    }
    if (!cryptoSuccess) {
      const payment = await this.prisma.transaction.create({
        data: {
          amount: data.amount,
          currency: '860',
          invoice_id: data.invoiceId,
          ip_id: ipId,
          description: data.description,
          cashbox_id: cashbox.id,
          status: 'Declined',
          reason_code: 7000,
          type: 'threeds',
          account_id: data.accountId,
          fail_reason: 'Invalid cryptogram packet',
          json_data: data.jsonData,
        },
      });
      console.error({
        time: new Date(),
        payment,
        cryptogram: data.cardCryptoGramPacket,
        message: 'Invalid cryptogram packet',
      });
      return CoreApiResponse.wrongCryptogram();
    }
    const paymentWithInvoiceIdExists = await this.prisma.transaction.findFirst({
      where: { invoice_id: data.invoiceId, cashbox_id: cashbox.id },
    });
    if (paymentWithInvoiceIdExists) {
      return await this.find(data.invoiceId, cashbox.id);
    }
    const { success: cSuccess, data: cData } = await this.cardService.create({
      cashboxId: cashbox.id,
      cryptogram: data.cardCryptoGramPacket,
    });
    const isTest = decryptedData.pan.includes('000000000000');
    if (!cSuccess) {
      await this.prisma.transaction.create({
        data: {
          amount: data.amount,
          currency: '860',
          invoice_id: data.invoiceId,
          type: 'threeds',
          is_test: isTest,
          ip_id: ipId,
          description: data.description,
          card_id: cData.cardId,
          cashbox_id: cashbox.id,
          status: 'Declined',
          account_id: data.accountId,
          fail_reason: cData.Model.Reason,
          reason_code: cData.Model.ReasonCode,
          status_code: 13,
        },
      });
      return cData;
    }
    const payment = await this.prisma.transaction.create({
      data: {
        amount: data.amount,
        currency: '860',
        type: 'hold',
        is_test: isTest,
        invoice_id: data.invoiceId,
        ip_id: ipId,
        description: data.description,
        card_id: cData.cardId,
        cashbox_id: cashbox.id,
        account_id: data.accountId,
        status: 'AwaitingAuthentication',
        json_data: data.jsonData || null,
      },
    });
    this.cardChargeTimedOut(payment.id);
    const customData = {
      Currency: 'UZS',
      Amount: String(data.amount),
      Description: data.description || null,
      id: cData.otpId,
      phone: cData.phone,
    };
    const customDataEncoded = Buffer.from(JSON.stringify(customData)).toString(
      'base64',
    );
    // TODO review this return
    return {
      Model: {
        TransactionId: payment.id,
        PaReq: customDataEncoded,
        AcsUrl: process.env.CURRENT_API_URL + '/check_areq',
        ThreeDsCallbackId: '7be4d37f0a434c0a8a7fc0e328368d7d',
        IFrameIsAllowed: true,
      },
      Success: false, //special for jet merchant
      Message: null,
    };
  }

  async tokensAuth(dto: IHold) {
    const card = await this.prisma.card.findFirst({
      where: { tk: dto.token, organization_id: dto.organizationId },
    });
    let model: CoreApiResponse;
    const paymentWithInvoiceExists = await this.prisma.transaction.findFirst({
      where: {
        invoice_id: dto.invoiceId,
        cashbox_id: dto.cashboxId,
      },
    });
    if (paymentWithInvoiceExists) {
      return await this.find(dto.invoiceId, dto.cashboxId);
    }
    if (!card) {
      model = CoreApiResponse.issuerNotFound({
        Amount: +dto.amount,
        Date: new Date(),
        Description: dto.description,
        InvoiceId: String(dto.invoiceId),
        AccountId: String(dto.accountId),
        Token: dto.token,
      });
      await this.prisma.transaction.create({
        data: {
          amount: dto.amount,
          invoice_id: String(dto.invoiceId),
          status: 'Declined',
          type: 'hold',
          account_id: dto.accountId,
          cashbox_id: dto.cashboxId,
          description: dto.description,
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          json_data: dto.jsonData,
        },
      });
      return model;
    }
    if (paymentWithInvoiceExists) {
      return await this.find(dto.invoiceId, dto.cashboxId);
    }
    let ip = await this.prisma.ip.findFirst({
      where: { ip_address: dto.ip },
    });
    if (!ip) {
      const location = await this.getLocationUtil.getLocationByIP(dto.ip);
      ip = await this.prisma.ip.create({
        data: {
          as: location.as,
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
          ip_address: dto.ip,
          isp: location.isp,
          lat: location.lat,
          lon: location.lon,
          org: location.org,
          region: location.region,
          regionName: location.regionName,
          timezone: location.timezone,
          zip: location.zip,
        },
      });
    }
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      card.cryptogram,
    );
    const { pan, expiry } = decryptedData;
    const cashbox = await this.prisma.cashbox.findFirst({
      where: {
        id: dto.cashboxId,
        is_active: true,
      },
    });
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        hold_amount: dto.amount,
        invoice_id: dto.invoiceId,
        card_id: card.id,
        status: 'Pending',
        type: 'hold',
        account_id: dto.accountId,
        cashbox_id: dto.cashboxId,
        description: dto.description,
        hold_id: '0',
        ip_id: ip.id,
        json_data: dto.jsonData,
      },
    });
    if (card.processing_card_token == 'test') {
      const res = await this.testService.holdTEST(
        transaction,
        card,
        ip,
        cashbox,
      );
      if (res.Success) {
        this.addHoldTimeout(transaction.id, transaction.cashbox_id);
      }
    }

    model = await this.processingService.hold({
      cashbox,
      pan,
      expiry,
      transaction,
      card,
      ip,
    });
    const updatedPayment = await this.prisma.transaction.findFirst({
      where: { id: transaction.id },
    });
    if (model.Success) {
      this.addHoldTimeout(transaction.id, transaction.cashbox_id);
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        await this.hookService.hook(
          payHook.url,
          'Payment',
          updatedPayment,
          card,
          updatedPayment.json_data,
        );
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        await this.hookService.hook(
          failHook.url,
          'Payment',
          updatedPayment,
          card,
          updatedPayment.json_data,
        );
      }
    }
    return model;
  }

  async confirmHold(dto: ConfirmHoldDto, cashboxId: number): Promise<IConfirmHoldResponse> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: dto.TransactionId,
        cashbox_id: cashboxId,
        status: 'Authorized',
      },
      include: {
        card: true,
        cashbox: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Payment not found');
    }
    if (parseFloat(dto.Amount + '') > parseFloat(transaction.amount + '')) {
      throw new NotAcceptableException(
        'Confirming amount can not be greater than holded amount',
      );
    }
    const card = transaction.card;
    const cashbox = transaction.cashbox;
    if (card.processing_card_token == 'test') {
      return await this.testService.confirmHoldTEST(
        transaction,
        dto.Amount,
        card,
      );
    }
    const processingRes = await this.processingService.confirmHold({
      transaction,
      card,
      cashbox,
      amount: dto.Amount,
    });
    /*const confirmHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'confirm' },
    });
    if (confirmHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
      });
      this.hookService.hook(
        confirmHook.url,
        'Payment',
        updatedPayment,
        card,
        updatedPayment.json_data,
      );
    }*/
    if (processingRes.Success) {
      const confirmHook = await this.prisma.hook.findFirst({
            where: { cashbox_id: cashbox.id, is_active: true, type: 'confirm' },
          });
          if (confirmHook) {
            const updatedPayment = await this.prisma.transaction.findFirst({
              where: { id: transaction.id },
              include: { card: true, ip: true, cashbox: true },
            });
            
            await this.hookService.sendHook(
              confirmHook.url,
              'confirm',
              cashbox.password_api,
              updatedPayment,
              updatedPayment.card,
              updatedPayment.ip,
              updatedPayment.json_data,
            );
          }
      }    
    return processingRes;
  }

  async cancelHold(transactionId: number, cashboxId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        status: 'Authorized',
        cashbox_id: cashboxId,
      },
      include: {
        card: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Payment not found');
    }
    const card = transaction.card;
    if (card.processing_card_token == 'test') {
      this.cancelHoldTimeout(transaction.id);
      return await this.testService.cancelHoldTEST(transaction);
    }
    const processingRes = await this.processingService.cancelHold({
      card,
      transaction,
    });
    if (processingRes.Success) {
      this.cancelHoldTimeout(transaction.id);
      
      const cancelHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashboxId, is_active: true, type: 'cancel' },
      });
      if (cancelHook) {
        const updatedPayment = await this.prisma.transaction.findFirst({
          where: { id: transaction.id },
          include: { cashbox: true },
        });
        
        await this.hookService.sendHook(
          cancelHook.url,
          'cancel',
          updatedPayment.cashbox.password_api,
          updatedPayment,
        );
    }
  }
    /*if (processingRes.Success) {
      this.cancelHoldTimeout(transaction.id);
      const cancelHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashboxId, type: 'cancel' },
      });
      if (cancelHook) {
        const updatedPayment = await this.prisma.transaction.findFirst({
          where: { id: transaction.id },
        });
        this.hookService.hook(
          cancelHook.url,
          'Payment',
          updatedPayment,
          card,
          updatedPayment.json_data,
        );
      }
    }*/

    return processingRes;
  }

  async refund(dto: RefundDto, cashboxId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: +dto.TransactionId,
        cashbox_id: cashboxId,
        status: 'Completed' 
      },
      include: {
        card: true,
        cashbox: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transactions not found');
    }
    if (transaction.status != 'Completed') {
      throw new NotAcceptableException('Transaction is not completed');
    }

    if (dto.Amount > Number(transaction.amount)) {
        throw new NotAcceptableException('Сумма возврата не может превышать сумму платежа');
    }

    const cashbox = transaction.cashbox;
    const card = transaction.card;
    if (card.processing_card_token == 'test') {
      await this.testService.refundTEST(transaction);
    } else {
      await this.processingService.refund({ 
            transaction, 
            card,
            amount: dto.Amount // ПЕРЕДАТЬ сумму возврата
      });
    }
    /*
    const refundHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'refund' },
    });
    if (refundHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
      });
      this.hookService.hook(
        refundHook.url,
        'Refund',
        updatedPayment,
        card,
        dto.JsonData || updatedPayment.json_data
      );
    }*/
    const refundHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'refund' },
    });
    if (refundHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
        include: { card: true, ip: true, cashbox: true },
      });
      
      // Создаем отдельную транзакцию возврата или используем существующую
      const refundTransaction = await this.prisma.transaction.create({
        data: {
          amount: transaction.amount,
          currency: transaction.currency,
          type: 'refund',
          status: 'Completed',
          cashbox_id: transaction.cashbox_id,
          card_id: transaction.card_id,
          invoice_id: transaction.invoice_id,
          account_id: transaction.account_id,
          description: `Refund for transaction ${transaction.id}`,
          processing_ref_num: `refund_${transaction.id}_${Date.now()}`,
        },
      });
      
      await this.hookService.sendHook(
        refundHook.url,
        'refund',
        cashbox.password_api,
        refundTransaction,
        transaction.card,
        transaction.ip,
        transaction.json_data,
        transaction, // original transaction
      );
    }
    return {
      Model: {
        TransactionId: dto.TransactionId,
      },
      Success: true,
      Message: null,
    };
  }

  async payByToken(dto: IPayByToken): Promise<CoreApiResponse> {
    const existingPayment = await this.prisma.transaction.findFirst({
        where: {
            invoice_id: dto.invoiceId,
            cashbox: {
                public_id: dto.publicId
            }
        },
    });
    
    if (existingPayment) {
      return (await this.find(dto.invoiceId, dto.cashboxId)) as CoreApiResponse;
    }
    const card = await this.prisma.card.findFirst({
        where: {
            tk: dto.token,
            organization_id: dto.organizationId,
        },
    });

    let model: CoreApiResponse;
    if (!card) {
      model = CoreApiResponse.issuerNotFound({
        Amount: +dto.amount,
        Date: new Date(),
        Description: dto.description,
        InvoiceId: String(dto.invoiceId),
        AccountId: String(dto.accountId),
        Token: dto.token,
      });
      await this.prisma.transaction.create({
        data: {
          amount: dto.amount,
          invoice_id: String(dto.invoiceId),
          status: 'Declined',
          type: 'recurrent',
          account_id: dto.accountId,
          cashbox_id: dto.cashboxId,
          description: dto.description,
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
          json_data: dto.json_data,
        },
      });
      return model;
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { id: dto.cashboxId, is_active: true },
      include: { company: true },
    });
    const company = cashbox.company;
    let ip = await this.prisma.ip.findFirst({
      where: { ip_address: dto.ip },
    });
    if (!ip) {
      const location = await this.getLocationUtil.getLocationByIP(dto.ip);
      ip = await this.prisma.ip.create({
        data: {
          as: location.as,
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
          ip_address: dto.ip,
          isp: location.isp,
          lat: location.lat,
          lon: location.lon,
          org: location.org,
          region: location.region,
          regionName: location.regionName,
          timezone: location.timezone,
          zip: location.zip,
        },
      });
    }
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        invoice_id: dto.invoiceId,
        description: dto.description,
        card_id: card.id,
        type: 'recurrent',
        account_id: dto.accountId,
        cashbox_id: dto.cashboxId,
        ip_id: ip.id,
        status: 'Pending',
        json_data: dto.json_data,
      },
    });
    const checkHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'check' },
    });
    if (checkHook) {
      const res = await this.hookService.hook(
        checkHook.url,
        'Payment',
        transaction,
        card,
      );
      if (res.code != 0) {
        const model = CoreApiResponse.invalidErrorCode();
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'Declined',
            fail_reason: model.Model.Reason,
            reason_code: model.Model.ReasonCode,
            status_code: res.code,
          },
        });
        return model;
      }
    }
    if (card.processing_card_token == 'test') {
      return await this.testService.payByTokenTEST(
        transaction,
        card,
        cashbox,
        ip,
      );
    }
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      card.cryptogram,
    );
    model = await this.processingService.payByToken({
      card,
      cashbox,
      ip,
      transaction,
      pan: decryptedData.pan,
      expiry: decryptedData.expiry,
      company,
    });
    if (model.Success) {
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        const updatedPayment = await this.prisma.transaction.findFirst({
          where: { id: transaction.id },
        });
        this.hookService.hook(payHook.url, 'Payment', updatedPayment, card);
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        const updatedPayment = await this.prisma.transaction.findFirst({
          where: { id: transaction.id },
        });
        this.hookService.hook(failHook.url, 'Payment', updatedPayment, card);
      }
    }
    return model;
  }

  async getDataByByTransactionId(transactionId: number) {
    return await this.processingService.getDataByTransactionId(transactionId);
  }

  private async cardChargeTimedOut(transactionId: number) {
    const milliseconds = this.cryptoPayTimeout * 60 * 1000;
    const timeout = setTimeout(async () => {
      await this.prisma.transaction.update({
        where: {
          id: transactionId,
          OR: [{ status: 'AwaitingAuthentication' }, { status: 'Authorized' }],
        },
        data: {
          status: 'Declined',
          reason_code: 5206,
          fail_reason: 'Authentication failed',
          updated_at: new Date(),
        },
      });
    }, milliseconds);
    this.schedulerRegistry.addTimeout(`${transactionId}`, timeout);
  }

  private async cancelCardChargeTimeout(transactionId: number) {
    this.schedulerRegistry.deleteTimeout(`${transactionId}`);
  }

  private async addHoldTimeout(transactionId: number, cashboxid: number) {
    const milliseconds = 1000 * 60 * 60 * 24 * 7;
    const timeout = setTimeout(async () => {
      await this.cancelHold(transactionId, cashboxid);
    }, milliseconds);
    this.schedulerRegistry.addTimeout(`${transactionId}`, timeout);
  }

  private async cancelHoldTimeout(transactionId: number) {
    this.schedulerRegistry.deleteTimeout(`${transactionId}`);
  }

  async p2p(dto: IP2P) {
    const card = await this.prisma.card.findFirst({
      where: { tk: dto.senderToken, status: 'Approved' },
    });
    if (!card) {
      throw new NotFoundException('Card not found or deactivated');
    }
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      card.cryptogram,
    );
    const { fullname: receiverName } =
      await this.processingService.getDataByPan(dto.receiverPan);
    const { balance } = await this.processingService.getDataByCardInfo(
      card,
      decryptedData.pan,
    );
    const transaction = await this.prisma.transaction.create({
      data: {
        amount: dto.amount,
        invoice_id: String(Date.now()),
        status: 'Pending',
        type: 'p2p',
        card_id: card.id,
        cashbox_id: dto.cashboxId,
        is_test: card.processing_card_token.includes('test'),
        receiever_pan:
          dto.receiverPan.slice(0, 6) + '******' + dto.receiverPan.slice(-4),
        receiver_fullname: receiverName,
        last_amount: +balance / 100,
      },
    });
    const res = await this.processingService.p2p({
      amount: +dto.amount,
      cashboxId: dto.cashboxId,
      receiverPan: dto.receiverPan,
      senderCard: card,
      transactionId: transaction.id,
    });
    if (res.success) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'Completed',
          processing_ref_num: res.refNum,
        },
      });
      return res;
    }
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'Cancelled',
        fail_reason: res.message,
        reason_code: res.code,
      },
    });
    return res;
  }

  async find(invoiceId: string, cashbox_id: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        cashbox_id: cashbox_id,
        invoice_id: invoiceId,
      },
      include: { card: true, ip: true, cashbox: true },
      orderBy: { created_at: 'desc' },
    });
    if (!transaction) return { Success: false, Message: 'Not found' };
    const card = transaction.card;
    const ip = transaction.ip;
    const cashbox = transaction.cashbox;
    const data = {
      AccountId: transaction.account_id,
      Amount: Number(transaction.amount),
      CardExpDate: card.expiry,
      CardType: card.processing,
      Date: transaction.created_at,
      Description: transaction.description,
      GatewayName: card.bank_name,
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
      Status: transaction.status,
    };
    let model: CoreApiResponse;
    if (transaction.status == 'Completed') {
      model = CoreApiResponse.success(data);
    } else if (transaction.status == 'Authorized') {
      model = CoreApiResponse.hold(data);
    } else if (transaction.reason_code == 5206) {
      model = CoreApiResponse.secure3d();
    } else if (transaction.reason_code == 5051) {
      model = CoreApiResponse.insufficentFunds(data);
    } else if (transaction.reason_code == 5015) {
      model = CoreApiResponse.issuerNotFound(data);
    } else if (transaction.reason_code == 5005) {
      model = CoreApiResponse.doNotHonor(data);
    } else if (transaction.reason_code == 5057) {
      model = CoreApiResponse.notPermitted();
    }
    return model;
  }
}
