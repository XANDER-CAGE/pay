import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValidateDto } from 'src/modules/home/dto/validate.dto';
import { CardsService } from '../cards/cards.service';
import { env } from 'src/common/config/env.config';

@Injectable()
export class HomeService {
  private readonly otpTimeout: number;
  private readonly cryptoPayTimeout: number;
  constructor(
    private readonly prisma: PrismaService,
    private readonly cardService: CardsService,
  ) {
    this.otpTimeout = env.OTP_TIMEOUT_IN_MINUTES;
    this.cryptoPayTimeout = env.PAY_VIA_CRYPTO_TIMEOUT_IN_MINUTES;
  }
  async validate(dto: ValidateDto) {
    const payment = await this.prisma.transaction.findFirst({
      where: {
        id: +dto.md,
        status: 'AwaitingAuthentication',
      },
      include: { card: { include: { otp: true } } },
    });
    if (!payment) {
      throw new NotFoundException(
        `Transaction not found or timed out (${this.cryptoPayTimeout} min)`,
      );
    }
    const card = payment.card;
    if (card.status == 'Banned') {
      throw new NotAcceptableException('Card is banned!');
    }
    const otp = card.otp;
    const { success, message } = await this.cardService.validateCard({
      card,
      otp,
      otpId: dto.otpId,
      smsCode: dto.smsCode,
    });
    if (!success) {
      throw new NotAcceptableException(message);
    }
    await this.prisma.transaction.update({
      where: {
        id: payment.id,
      },
      data: {
        status: 'Authorized',
        updated_at: new Date(),
      },
    });
  }
}
