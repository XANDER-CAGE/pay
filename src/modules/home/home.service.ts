import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecryptService } from '../decrypt/decrypt.service';
import { ProcessingService } from '../processing/processing.service';
import { ValidateDto } from 'src/modules/home/dto/validate.dto';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class HomeService {
  private readonly otpTimeout: number;
  private readonly cryptoPayTimeout: number;
  constructor(
    private readonly prisma: PrismaService,
    private readonly decryptService: DecryptService,
    private readonly processingService: ProcessingService,
    private readonly cardService: CardsService,
  ) {
    this.otpTimeout = Number(process.env.OTP_TIMEOUT_IN_MINUTES) || 2;
    this.cryptoPayTimeout =
      Number(process.env.PAY_VIA_CRYPTO_TIMEOUT_IN_MINUTES) || 10;
  }
  async validate(dto: ValidateDto) {
    const payment = await this.prisma.payment.findFirst({
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
    await this.prisma.payment.update({
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
