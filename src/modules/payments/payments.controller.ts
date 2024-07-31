import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentChargeDto } from './dto/payment-charge.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import { Handle3dsPostDto } from './dto/handle3dsPost.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { HoldDto } from './dto/hold.dto';
import * as path from 'path';
import * as fs from 'fs';
import { RefundDto } from './dto/refund.dto';
import { PayByTokenDto } from './dto/payByToken.dto';
import { ConfirmHoldDto } from './dto/confirmHold.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { P2PDto } from './dto/p2p.dto';
import { ApiTags } from '@nestjs/swagger';
import { FindDto } from './dto/find.dto';

@ApiTags('Transactions')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post('cards/charge')
  async charge(@Body() dto: PaymentChargeDto, @Req() req: MyReq): Promise<any> {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.charge({
      ip: req['x-real-ip'],
      cardCryptoGramPacket: dto.CardCryptogramPacket,
      amount: dto.Amount,
      invoiceId: dto.InvoiceId,
      description: dto.Description,
      accountId: dto.AccountId,
    });
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
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

  @UseGuards(AuthGuard)
  @Post('cards/auth')
  async hold(@Body() dto: HoldDto, @Req() req: MyReq) {
    return await this.paymentsService.hold({
      ip: req['x-real-ip'],
      amount: String(dto.Amount),
      invoiceId: dto.InvoiceId,
      description: dto.Description,
      accountId: dto.AccountId,
      cashboxId: req.cashboxId,
      token: dto.Token,
      organizationId: req.organizationId,
    });
  }

  @UseGuards(AuthGuard)
  @Post('confirm')
  async confirmHold(@Body() dto: ConfirmHoldDto, @Req() req: MyReq) {
    return await this.paymentsService.confirmHold(dto, req.cashboxId);
  }

  @UseGuards(AuthGuard)
  @Post('void')
  async cancelHold(
    @Body('TransactionId') transactionId: number,
    @Req() req: MyReq,
  ) {
    return await this.paymentsService.cancelHold(transactionId, req.cashboxId);
  }

  @Get('publickey')
  findOne() {
    let publicKey = fs.readFileSync(
      path.join(__dirname, './../../../certs/public_key.pem'),
      'utf8',
    );
    publicKey = publicKey.replace(/\n/g, '');
    return {
      Pem: publicKey,
      Version: 1,
    };
  }

  @UseGuards(AuthGuard)
  @Post('refund')
  async refund(@Body() dto: RefundDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.refund(dto, req.cashboxId);
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
    const result = await this.paymentsService.payByToken({
      accountId: dto.AccountId,
      amount: String(dto.Amount),
      cashboxId: req.cashboxId,
      description: dto.Description,
      invoiceId: dto.InvoiceId,
      token: dto.Token,
      ip: req['x-real-ip'],
      organizationId: req.organizationId,
    });
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @UseGuards(AdminGuard)
  @Post('tokens/p2p')
  async p2p(@Body() dto: P2PDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.p2p({
      cashboxId: req.cashboxId,
      ...dto,
    });
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @HttpCode(200)
  @Post('find')
  async find(@Body() dto: FindDto, @Req() req: MyReq) {
    return await this.paymentsService.find(dto.InvoiceId, req);
  }

  @Get(':transactionId')
  async invoice(@Param('transactionId') transactionId: string) {
    return await this.paymentsService.getDataByByTransactionId(+transactionId);
  }
}
