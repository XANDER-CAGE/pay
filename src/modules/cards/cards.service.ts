import { Injectable, NotAcceptableException } from '@nestjs/common';
import { DecryptService } from '../decrypt/decrypt.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingService } from '../processing/processing.service';
import { ISendOtp } from '../processing/interfaces/sendOtpResponse.interface';
import { CoreApiResponse } from 'src/common/classes/model.class';
import * as crypto from 'crypto';
import { card, cashbox, otp } from '@prisma/client';
import { SchedulerRegistry } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';

interface IValidateCard {
  card: card;
  otp: otp;
  otpId: string;
  smsCode: string;
}

interface ICreateCard {
  cryptogram: string;
  cashboxId: number;
}

interface ICreateCardResponse {
  success: boolean;
  data: any;
}

@Injectable()
export class CardsService {
  private readonly otpTimeout: number;
  private firstCardBanTimeoutInMinutes: number;
  private secondCardBanTimeoutInHours: number;
  constructor(
    private readonly decryptService: DecryptService,
    private readonly prisma: PrismaService,
    private readonly processingService: ProcessingService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
  ) {
    this.otpTimeout = +process.env.OTP_TIMEOUT_IN_MINUTES || 1;
    this.firstCardBanTimeoutInMinutes =
      +process.env.FIRST_CARD_BAN_MINUTES || 60;
    this.secondCardBanTimeoutInHours = +process.env.SECOND_CARD_BAN_HOURS || 24;
  }

  async create(createCardDto: ICreateCard): Promise<ICreateCardResponse> {
    const { cryptogram, cashboxId } = createCardDto;
    const { decryptedData, success } =
      this.decryptService.decryptCardCryptogram(cryptogram);
    if (!success) {
      return {
        success: false,
        data: CoreApiResponse.wrongCryptogram(),
      };
    }
    const isTest = decryptedData.pan.includes('000000000000');
    if (isTest) {
      return this.createTEST(createCardDto);
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { id: cashboxId, status: 'active' },
    });
    if (!cashbox) {
      throw new NotAcceptableException('Active cashbox not found');
    }
    const { expiry, pan } = decryptedData;
    const tk = crypto
      .createHash('md5')
      .update(pan + Date.now())
      .digest('hex');
    const panRef = crypto.createHash('md5').update(pan).digest('hex');
    const existingCard = await this.prisma.card.findFirst({
      where: { pan_ref: panRef },
      select: { status: true },
    });
    if (existingCard && existingCard.status == 'Banned') {
      return {
        success: false,
        data: CoreApiResponse.notPermitted(),
      };
    }
    const card = await this.prisma.card.upsert({
      where: { pan_ref: panRef },
      create: {
        cryptogram,
        expiry,
        masked_pan: pan.slice(0, 6) + '******' + pan.slice(-4),
        pan_ref: panRef,
        tk: 'tk_' + tk,
        status: 'Unapproved',
      },
      update: {
        updated_at: new Date(),
      },
    });
    this.prisma.added_cards.create({
      data: {
        card_id: card.id,
        cashbox_id: cashboxId,
      },
    });
    const { otpId, phone } = await this.sendOtp(card, cashbox);
    return {
      success: true,
      data: {
        tk: card.tk,
        otpId: otpId,
        phone,
        cardId: card.id,
      },
    };
  }

  async sendOtp(card: card, cashbox: cashbox): Promise<ISendOtp> {
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      card.cryptogram,
    );
    if (card.processing_card_token == 'test') {
      return this.sendOtpTEST(card, cashbox);
    }
    const { expiry, pan } = decryptedData;
    return await this.processingService.sendOtp(pan, expiry, card.id, cashbox);
  }

  async validateCard(data: IValidateCard) {
    const isTest = data.card.masked_pan.includes('000000000000');
    if (isTest) {
      return this.validateCardTEST(data);
    }
    const now = Date.now();
    const otpTimeOutInMilliseconds = this.otpTimeout * 60 * 1000;
    const isOverDue =
      now - data.otp.updated_at.getTime() > otpTimeOutInMilliseconds;
    if (isOverDue) {
      throw new NotAcceptableException('Otp timed out');
    }
    const { decryptedData } = this.decryptService.decryptCardCryptogram(
      data.card.cryptogram,
    );
    const validateData = await this.processingService.validate(
      decryptedData.pan,
      data.smsCode,
      data.otpId,
    );
    if (validateData.success) {
      const { bankName, cardToken, cardType, fullname, phone } =
        validateData.cardData;
      await this.prisma.card.update({
        where: {
          id: data.card.id,
        },
        data: {
          status: 'Approved',
          otp: { update: { fail_attempts: 0 } },
          bank_name: bankName,
          processing_card_token: cardToken,
          processing: cardType,
          fullname,
          phone,
          updated_at: new Date(),
        },
      });
      return {
        success: true,
        tk: data.card.tk,
      };
    }
    await this.prisma.otp.update({
      where: { id: data.otp.id },
      data: { fail_attempts: { increment: 1 }, updated_at: new Date() },
    });
    if (data.otp.fail_attempts == 2) {
      if (data.otp.ban_count == 0) {
        this.unlockCardAfterNMinutes(
          data.card.id,
          this.firstCardBanTimeoutInMinutes,
        );
        return {
          success: false,
          message: `Wrong password. Banned for ${this.firstCardBanTimeoutInMinutes} minute/s`,
        };
      } else if (data.otp.ban_count == 1) {
        this.unlockCardAfterNMinutes(
          data.card.id,
          this.secondCardBanTimeoutInHours * 60,
        );
        return {
          success: false,
          message: `Wrong password. Banned for ${this.firstCardBanTimeoutInMinutes} hour/s`,
        };
      }
      await this.prisma.card.update({
        where: { id: data.card.id },
        data: {
          status: 'Banned',
          otp: {
            update: { ban_count: { increment: 1 }, updated_at: new Date() },
          },
        },
      });
    }

    return {
      success: false,
      message: 'Wrong one time password',
    };
  }

  private async unlockCardAfterNMinutes(cardId: number, minutes: number) {
    const milliseconds = 1000 * 60 * minutes;
    const timeout = setTimeout(async () => {
      await this.prisma.card.update({
        where: { id: cardId },
        data: {
          status: 'Unapproved',
          otp: { update: { fail_attempts: 0 } },
          updated_at: new Date(),
        },
      });
    }, milliseconds);
    this.schedulerRegistry.addTimeout('unlockCard', timeout);
  }

  async createTEST(createCardDto: ICreateCard): Promise<ICreateCardResponse> {
    const { cryptogram, cashboxId } = createCardDto;
    const { decryptedData, success } =
      this.decryptService.decryptCardCryptogram(cryptogram);
    if (!success) {
      return {
        success: false,
        data: CoreApiResponse.wrongCryptogram(),
      };
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { id: cashboxId, status: 'active' },
    });
    if (!cashbox) {
      throw new NotAcceptableException('Active cashbox not found');
    }
    const { expiry, pan } = decryptedData;
    const tk = crypto
      .createHash('md5')
      .update(pan + Date.now())
      .digest('hex');
    const panRef = crypto.createHash('md5').update(pan).digest('hex');
    const existingCard = await this.prisma.card.findFirst({
      where: { pan_ref: panRef },
      select: { status: true },
    });
    if (existingCard && existingCard.status == 'Banned') {
      return {
        success: false,
        data: CoreApiResponse.notPermitted(),
      };
    }
    const card = await this.prisma.card.upsert({
      where: { pan_ref: panRef },
      create: {
        cryptogram,
        expiry,
        masked_pan: pan,
        processing: pan.startsWith('8600') ? 'uzcard' : 'humo',
        pan_ref: panRef,
        tk: 'tk_' + tk,
        status: 'Unapproved',
        processing_card_token: 'test',
      },
      update: {
        updated_at: new Date(),
      },
    });
    this.prisma.added_cards.create({
      data: {
        card_id: card.id,
        cashbox_id: cashboxId,
      },
    });
    const { otpId, phone } = await this.sendOtpTEST(card, cashbox);
    return {
      success: true,
      data: {
        tk: card.tk,
        otpId: otpId,
        phone,
        cardId: card.id,
      },
    };
  }

  private async sendOtpTEST(card: card, cashbox: cashbox): Promise<ISendOtp> {
    let otpCode = '';
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    otpCode += firstDigit.toString();
    for (let i = 0; i < 5; i++) {
      const digit = Math.floor(Math.random() * 10).toString();
      otpCode += digit;
    }
    const hashedOtp = crypto.createHash('md5').update(otpCode).digest('hex');
    const message = `Global Pay: ваш ТЕСТОВЫЙ код подтверждения в ${cashbox.name} ${otpCode}`;
    const phone = card.phone || '998931821222';
    await this.notificationService.send(phone, message);
    const otp = await this.prisma.otp.upsert({
      where: { card_id: card.id },
      create: {
        card_id: card.id,
        hashed_otp: hashedOtp,
      },
      update: {
        hashed_otp: hashedOtp,
        updated_at: new Date(),
      },
    });
    return {
      otpId: String(otp.id),
      phone: card.phone,
    };
  }

  async validateCardTEST(data: IValidateCard) {
    const now = Date.now();
    const otpTimeOutInMilliseconds = this.otpTimeout * 60 * 1000;
    const isOverDue =
      now - data.otp.updated_at.getTime() > otpTimeOutInMilliseconds;
    if (isOverDue) {
      throw new NotAcceptableException('Otp timed out');
    }
    const hashedOtp = crypto
      .createHash('md5')
      .update(data.smsCode)
      .digest('hex');
    if (data.otp.hashed_otp == hashedOtp) {
      await this.prisma.card.update({
        where: {
          id: data.card.id,
        },
        data: {
          status: 'Approved',
          otp: { update: { fail_attempts: 0 } },
          bank_name: 'test',
          processing_card_token: 'test',
          fullname: 'ABDULLAYEV MASTURBEK',
          updated_at: new Date(),
        },
      });
      return {
        success: true,
        tk: data.card.tk,
      };
    }
    await this.prisma.otp.update({
      where: { id: data.otp.id },
      data: { fail_attempts: { increment: 1 }, updated_at: new Date() },
    });
    if (data.otp.fail_attempts == 2) {
      if (data.otp.ban_count == 0) {
        this.unlockCardAfterNMinutes(
          data.card.id,
          this.firstCardBanTimeoutInMinutes,
        );
        return {
          success: false,
          message: `Wrong password. Banned for ${this.firstCardBanTimeoutInMinutes} minute/s`,
        };
      } else if (data.otp.ban_count == 1) {
        this.unlockCardAfterNMinutes(
          data.card.id,
          this.secondCardBanTimeoutInHours * 60,
        );
        return {
          success: false,
          message: `Wrong password. Banned for ${this.firstCardBanTimeoutInMinutes} hour/s`,
        };
      }
      await this.prisma.card.update({
        where: { id: data.card.id },
        data: {
          status: 'Banned',
          otp: {
            update: { ban_count: { increment: 1 }, updated_at: new Date() },
          },
        },
      });
      return {
        success: false,
        message: `Wrong password. Card banned`,
      };
    }

    return {
      success: false,
      message: 'Wrong one time password',
    };
  }
}
