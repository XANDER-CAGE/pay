import {
  Controller,
  Post,
  Body,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { ValidateCardDto } from './dto/validateCard.dto';
import { SendOtpDto } from './dto/sendOtp.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CoreApiResponse } from 'src/common/classes/model.class';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Cards')
@Controller('cards')
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('add')
  async create(@Body() createCardDto: CreateCardDto, @Req() req: MyReq) {
    const { success, data } = await this.cardsService.create({
      cryptogram: createCardDto.CardCryptogramPacket,
      cashboxId: req.cashboxId,
    });
    if (success) {
      return {
        Success: true,
        Model: {
          Tk: data.tk,
          OtpId: data.otpId,
          Phone: '***' + data.phone.slice(-4),
        },
        Message: 'Password sent to cardholder phone',
      };
    }
    return data;
  }

  @UseGuards(AuthGuard)
  @Post('send-otp')
  async sendOtp(@Body() dto: SendOtpDto, @Req() req: MyReq) {
    const card = await this.prisma.card.findFirst({
      where: { tk: dto.Tk },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.status == 'Banned') {
      return CoreApiResponse.notPermitted();
    }
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { id: req.cashboxId },
    });
    const { otpId, phone } = await this.cardsService.sendOtp(card, cashbox);
    return {
      Success: true,
      Model: {
        OtpId: otpId,
        Phone: '********' + phone.slice(-4),
      },
    };
  }

  @UseGuards(AuthGuard)
  @Post('validate')
  async validate(@Body() dto: ValidateCardDto) {
    const card = await this.prisma.card.findFirst({
      where: {
        tk: dto.Tk,
      },
      include: { otp: true },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.status == 'Banned') {
      return CoreApiResponse.notPermitted();
    }
    const otp = card.otp;
    return this.cardsService.validateCard({
      card,
      otp,
      otpId: dto.OtpId,
      smsCode: dto.SmsCode,
    });
  }
}
