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
        processing: dto.cardType,
        currency: dto.currency,
        hide_cvv_input: dto.hideCvvInput,
        logo_url: dto.logoUrl,
      },
      create: {
        bank_name: dto.bankName,
        processing: dto.cardType,
        currency: dto.currency,
        hide_cvv_input: dto.hideCvvInput,
        logo_url: dto.logoUrl,
        bin: dto.bin,
      },
    });
  }

  async findOne(bin: number) {
    return await this.prisma.bin.findFirst({ where: { bin } });
  }
}
