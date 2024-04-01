import { ConflictException, Injectable } from '@nestjs/common';
import { CreateCardDto } from './dto/create-card.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateCardDto) {
    const card = await this.prisma.card_info.findFirst({
      where: {
        tk: dto.token,
      },
    });
    if (card) {
      throw new ConflictException('This token already exists: ' + dto.token);
    }
    return await this.prisma.card_info.create({
      data: {
        card_cryptogram_packet: dto.cryptogram,
        pan: dto.pan,
        expiry: dto.expiry,
        card_type: dto.cardType,
        tk: dto.token,
        processing_id: dto.processingId,
        cashbox_id: dto.cashboxId,
        created_at: new Date('2022'),
      },
    });
  }

  findAll() {
    return `This action returns all cards`;
  }

  findOne(id: number) {
    return `This action returns a #${id} card`;
  }

  remove(id: number) {
    return `This action removes a #${id} card`;
  }
}
