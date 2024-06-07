import { Module } from '@nestjs/common';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DecryptModule } from '../decrypt/decrypt.module';
import { ProcessingModule } from '../processing/processing.module';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [PrismaModule, DecryptModule, ProcessingModule, CardsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
