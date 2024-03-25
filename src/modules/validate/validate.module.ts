import { Module } from '@nestjs/common';
import { ValidateService } from './validate.service';
import { ValidateController } from './validate.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DecryptModule } from '../decrypt/decrypt.module';
import { ProcessingModule } from '../processing/processing.module';

@Module({
  imports: [PrismaModule, DecryptModule, ProcessingModule],
  controllers: [ValidateController],
  providers: [ValidateService],
})
export class ValidateModule {}
