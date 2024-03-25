import { Module } from '@nestjs/common';
import { DecryptService } from './decrypt.service';
import { DecryptController } from './decrypt.controller';

@Module({
  controllers: [DecryptController],
  providers: [DecryptService],
  exports: [DecryptService],
})
export class DecryptModule {}
