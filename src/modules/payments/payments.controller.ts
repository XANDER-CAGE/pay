import {
  Controller,
  Get,
  Post,
  InternalServerErrorException,
  UseGuards,
  Body,
  Req,
  Param,
  Inject,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { PaymentChargeDto } from './dto/payment-charge.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import { AntifraudService } from './antifraud.service';
import { Handle3dsPostDto } from './dto/handle3dsPost.dto';
import { RefundDto } from './dto/refund.dto';
import { PayByTokenDto } from './dto/payByToken.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly antiFraudservice: AntifraudService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // @UseGuards(AuthGuard)
  @Post('cards/charge')
  async charge(@Body() dto: PaymentChargeDto, @Req() req: MyReq) {
    // const isFraud = await this.antiFraudservice.checkForFraud(
    //   req.ip,
    //   dto.Amount,
    // );
    // if (isFraud) {
    //   throw new HttpException(
    //     "'Suspicious transaction detected. Payment declined.",
    //     HttpStatus.TOO_MANY_REQUESTS,
    //   );
    // }
    const result = await this.paymentsService.charge(dto, req);
    return result;
  }

  @Post('cards/post3ds')
  async post3ds(@Body() dto: Handle3dsPostDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.handle3DSPost(dto);
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @Get('publickey')
  findOne() {
    try {
      let publicKey = fs.readFileSync(
        path.join(__dirname, './../../../certs/public_key.pem'),
        'utf8',
      );
      publicKey = publicKey.replace(/\n/g, '');
      return {
        Pem: publicKey,
        Version: 1,
      };
    } catch (err) {
      console.error('Ошибка чтения файла public_key.pem: ', err.message);
      throw new InternalServerErrorException(
        'Ошибка при чтении файла: ' + err.message,
      );
    }
  }

  @Post('refund')
  async refund(@Body() dto: RefundDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.refund(dto);
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('tokens/charge')
  async payByToken(@Body() dto: PayByTokenDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.payByToken(dto, req);
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @Get(':transactionId')
  async invoice(@Param('transactionId') transactionId: string) {
    return await this.paymentsService.getDataByByTransactionId(+transactionId);
  }
}
