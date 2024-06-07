import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { DecryptModule } from '../decrypt/decrypt.module';
import { ProcessingModule } from '../processing/processing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [DecryptModule, ProcessingModule, PrismaModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
