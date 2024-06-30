import {
  ConflictException,
  Inject,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import {
  GetLocationUtil,
  getLocationSymbol,
} from 'src/common/utils/getGeoLocation.util';
import { DecryptService } from '../decrypt/decrypt.service';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingService } from '../processing/processing.service';
import { Handle3dsPostDto } from './dto/handle3dsPost.dto';
import { RefundDto } from './dto/refund.dto';
import { ConfirmHoldDto } from './dto/confirmHold.dto';
import { CardsService } from '../cards/cards.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { HookService } from '../hook/hook.service';
import { IConfirmHoldResponse } from '../processing/interfaces/confirmHoldResponse.interface';
import { PaymentsTESTService } from './payments.test.service';
import { isObject } from 'lodash';
import { env } from 'src/common/config/env.config';
import { HookDto } from '../hook/dto/hook.dto';

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
}

interface IP2P {
  senderToken: string;
  receiverPan: string;
  amount: string;
  cashboxId: number;
}

@Injectable()
export class PaymentsService {
  private readonly cryptoPayTimeout: number;
  private readonly currentApiUrl: string;
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
    this.cryptoPayTimeout = env.PAY_VIA_CRYPTO_TIMEOUT_IN_MINUTES;
    this.currentApiUrl = env.CURRENT_API_URL;
  }
  async charge(data: ICardsChargeData) {
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
      throw new ConflictException(
        'Transaction with such invoice already exists',
      );
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
        AcsUrl: this.currentApiUrl + '/check_areq',
        ThreeDsCallbackId: '7be4d37f0a434c0a8a7fc0e328368d7d',
        IFrameIsAllowed: true,
      },
      Success: false, //special for jet merchant
      Message: null,
    };
  }

  async handle3DSPost(dto: Handle3dsPostDto): Promise<CoreApiResponse> {
    console.log('#DS DTO', dto);
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
    console.log('AFTER CHANGE', dto.TransactionId);
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
      const hookDto = new HookDto(transaction, card, 'Payment', checkHook.url);
      const res = await this.hookService.sendToHookQueue(hookDto);
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
    const resFrom3ds = await this.processingService.handle3dsPost({
      cashbox,
      company,
      pan: decryptedData.pan,
      transaction,
      expiry: decryptedData.expiry,
      ip,
      card,
    });
    this.cancelCardChargeTimeout(transaction.id);
    const updatedPayment = await this.prisma.transaction.findFirst({
      where: { id: transaction.id },
    });
    if (resFrom3ds.Success) {
      const payHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'pay' },
      });
      if (payHook) {
        const hookDto = new HookDto(
          updatedPayment,
          card,
          'Payment',
          payHook.url,
        );
        this.hookService.sendToHookQueue(hookDto);
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        const hookDto = new HookDto(
          updatedPayment,
          card,
          'Payment',
          failHook.url,
        );
        this.hookService.sendToHookQueue(hookDto);
      }
    }
    return resFrom3ds;
  }

  async hold(dto: IHold) {
    const card = await this.prisma.card.findFirst({
      where: { tk: dto.token, organization_id: dto.organizationId },
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
          type: 'hold',
          account_id: dto.accountId,
          cashbox_id: dto.cashboxId,
          description: dto.description,
          fail_reason: model.Model.Reason,
          reason_code: model.Model.ReasonCode,
        },
      });
      return model;
    }
    const paymentWithInvoiceExists = await this.prisma.transaction.findFirst({
      where: {
        invoice_id: dto.invoiceId,
        cashbox_id: dto.cashboxId,
      },
    });
    if (paymentWithInvoiceExists) {
      throw new ConflictException('Transaction with Invoice already exists');
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
    const processingRes = await this.processingService.hold({
      cashbox,
      pan,
      expiry,
      transaction,
      card,
      ip,
    });
    if (processingRes.Success) {
      this.addHoldTimeout(transaction.id, transaction.cashbox_id);
    }
    return processingRes;
  }

  async confirmHold(
    dto: ConfirmHoldDto,
    cashboxId: number,
  ): Promise<IConfirmHoldResponse> {
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
    const confirmHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'confirm' },
    });
    if (confirmHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
      });
      const hookDto = new HookDto(
        updatedPayment,
        card,
        'Payment',
        confirmHook.url,
      );
      this.hookService.sendToHookQueue(hookDto);
    }
    if (processingRes.Success) {
      this.cancelHoldTimeout(transaction.id);
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
    }
    return processingRes;
  }

  async refund(dto: RefundDto, cashboxId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: +dto.TransactionId,
        cashbox_id: cashboxId,
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
    const cashbox = transaction.cashbox;
    const card = transaction.card;
    if (card.processing_card_token == 'test') {
      await this.testService.refundTEST(transaction);
    } else {
      await this.processingService.refund({ transaction, card });
    }
    const refundHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'refund' },
    });
    if (refundHook) {
      const updatedPayment = await this.prisma.transaction.findFirst({
        where: { id: transaction.id },
      });
      const hookDto = new HookDto(
        updatedPayment,
        card,
        'Refund',
        refundHook.url,
      );
      this.hookService.sendToHookQueue(hookDto);
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
        cashbox_id: dto.cashboxId,
      },
    });
    if (existingPayment) {
      throw new ConflictException('Transaction with invoice id already exists');
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
      model = CoreApiResponse.notPermitted();
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
      },
    });
    const checkHook = await this.prisma.hook.findFirst({
      where: { cashbox_id: cashbox.id, is_active: true, type: 'check' },
    });
    if (checkHook) {
      const hookDto = new HookDto(transaction, card, 'Payment', checkHook.url);
      const res = await this.hookService.sendToHookQueue(hookDto);
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
    model = await this.processingService.payByCard({
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
        const hookDto = new HookDto(
          updatedPayment,
          card,
          'Payment',
          payHook.url,
        );
        this.hookService.sendToHookQueue(hookDto);
      }
    } else {
      const failHook = await this.prisma.hook.findFirst({
        where: { cashbox_id: cashbox.id, is_active: true, type: 'fail' },
      });
      if (failHook) {
        const updatedPayment = await this.prisma.transaction.findFirst({
          where: { id: transaction.id },
        });
        const hookDto = new HookDto(
          updatedPayment,
          card,
          'Payment',
          failHook.url,
        );
        this.hookService.sendToHookQueue(hookDto);
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
}
