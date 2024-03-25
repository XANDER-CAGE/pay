import { Injectable } from '@nestjs/common';
import { CreateBinDto } from './dto/create-bin.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BinsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateBinDto) {
    return await this.prisma.bin.upsert({
      where: {
        bin: dto.bin,
      },
      update: {
        bank_name: dto.bankName,
        card_type: dto.cardType,
        currency: dto.currency,
        hide_cvv_input: dto.hideCvvInput,
        country_code: dto.countryCode,
        logo_url: dto.logoUrl,
      },
      create: {
        bank_name: dto.bankName,
        card_type: dto.cardType,
        currency: dto.currency,
        hide_cvv_input: dto.hideCvvInput,
        country_code: dto.countryCode,
        logo_url: dto.logoUrl,
        bin: dto.bin,
      },
    });
  }

  async findOne(bin: string) {
    return await this.prisma.bin.findFirst({
      where: {
        bin,
      },
      select: {
        bank_name: true,
        bin: true,
        card_type: true,
        country_code: true,
        currency: true,
        hide_cvv_input: true,
        id: true,
        logo_url: true,
      },
    });
  }
}
