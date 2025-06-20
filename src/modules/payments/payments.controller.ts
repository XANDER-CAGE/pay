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
import * as path from 'path';
import * as fs from 'fs';
import { RefundDto } from './dto/refund.dto';
import { PayByTokenDto } from './dto/payByToken.dto';
import { ConfirmHoldDto } from './dto/confirmHold.dto';
import { AdminGuard } from 'src/common/guards/admin.guard';
import { P2PDto } from './dto/p2p.dto';
import { ApiTags } from '@nestjs/swagger';
import { FindDto } from './dto/find.dto';
import { CardsHoldDto } from './dto/cards-hold.dto';
import { TokensHoldDto } from './dto/tokens-hold.dto';
import { TestDto } from './dto/test.dto'
import { GetTransactionDto } from './dto/get-transaction.dto';
import { TransactionListDto } from './dto/transaction-list.dto';

@ApiTags('Transactions')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}


  @Get('test')
  @HttpCode(200)
  async test(): Promise<any> {
    return this.paymentsService.test();
  }

  @Post('get')
  async get(@Body() dto: GetTransactionDto, @Req() req: Request): Promise<any> {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          throw new UnauthorizedException();
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [publicId, apiSecret] = credentials.split(':');
      
      const cashbox = await this.prisma.cashbox.findFirst({
          where: { public_id: publicId, api_secret: apiSecret, is_active: true },
      });
      
      if (!cashbox) {
          throw new UnauthorizedException();
      }
      
      return await this.paymentsService.getTransaction(dto.TransactionId, cashbox.id);
  }

  @UseGuards(AuthGuard)
  @Post('cards/topup')
  @HttpCode(200)
  async topupByCryptogram(@Body() dto: TopupCryptogramDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    
    const result = await this.paymentsService.topupByCryptogram({
      ...dto,
      cashboxId: req.cashboxId,
    });
    
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @UseGuards(AuthGuard)
  @Post('token/topup')
  @HttpCode(200)
  async topupByToken(@Body() dto: TopupTokenDto, @Req() req: MyReq) {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    
    const result = await this.paymentsService.topupByToken({
      ...dto,
      cashboxId: req.cashboxId,
      organizationId: req.organizationId,
    });
    
    if (requestId) {
      await this.cacheManager.set(requestId, JSON.stringify(result));
    }
    return result;
  }

  @Post('cards/charge')
  async charge(@Body() dto: PaymentChargeDto, @Req() req: MyReq): Promise<any> {
    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
      return JSON.parse(cache);
    }
    const result = await this.paymentsService.charge({
      ip: dto.IpAddress,
      cardCryptoGramPacket: dto.CardCryptogramPacket,
      amount: dto.Amount,
      invoiceId: dto.InvoiceId,
      description: dto.Description,
      accountId: dto.AccountId,
      jsonData: dto.JsonData,
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
  @HttpCode(200)
  @Post('cards/auth')
  async cardsAuth(@Body() dto: CardsHoldDto, @Req() req: Request): Promise<any> {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new UnauthorizedException();
    }

    const requestId: string = req.headers['x-request-id'] as string;
    const cache: string = await this.cacheManager.get(requestId);
    if (cache) {
        return JSON.parse(cache);
    }


    return await this.paymentsService.cardsAuth({
      accountId: dto.AccountId,
      amount: +dto.Amount,
      cardCryptoGramPacket: dto.CardCryptogramPacket,
      description: dto.Description,
      invoiceId: dto.InvoiceId,
      ip: dto.IpAddress,
      jsonData: dto.JsonData,
    });
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('tokens/auth')
  async tokensAuth(@Body() dto: TokensHoldDto, @Req() req: MyReq) {
    return await this.paymentsService.tokensAuth({
      ip: req['x-real-ip'],
      amount: String(dto.Amount),
      invoiceId: dto.InvoiceId,
      description: dto.Description,
      accountId: dto.AccountId,
      cashboxId: req.cashboxId,
      token: dto.Token,
      organizationId: req.organizationId,
      jsonData: dto.JsonData,
    });
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('confirm')
  async confirmHold(@Body() dto: ConfirmHoldDto, @Req() req: MyReq) {
    return await this.paymentsService.confirmHold(dto, req.cashboxId);
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
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
      json_data: dto.JsonData,
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
  async find(@Body() dto: FindDto, @Req() req: Request): Promise<any> {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          throw new UnauthorizedException();
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [publicId, apiSecret] = credentials.split(':');
      
      const cashbox = await this.prisma.cashbox.findFirst({
          where: { public_id: publicId, api_secret: apiSecret, is_active: true },
      });
      
      if (!cashbox) {
          throw new UnauthorizedException();
      }
      
      return await this.paymentsService.find(dto.InvoiceId, cashbox.id);
  }

  @Get(':transactionId')
  async getTransactionInfo(@Param('transactionId') transactionId: string) {
      // Этот метод должен возвращать публичную информацию о транзакции
      // Без аутентификации для интеграции с виджетами
      return await this.paymentsService.getPublicTransactionInfo(+transactionId);
  }

  @Post('list')
  async list(@Body() dto: TransactionListDto, @Req() req: Request): Promise<any> {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          throw new UnauthorizedException();
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [publicId, apiSecret] = credentials.split(':');
      
      const cashbox = await this.prisma.cashbox.findFirst({
          where: { public_id: publicId, api_secret: apiSecret, is_active: true },
      });
      
      if (!cashbox) {
          throw new UnauthorizedException();
      }
      
      return await this.paymentsService.getTransactionsList(dto, cashbox.id);
  }

  @Post('v2/payments/list')
  async listV2(@Body() dto: TransactionListV2Dto, @Req() req: Request): Promise<any> {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
          throw new UnauthorizedException();
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [publicId, apiSecret] = credentials.split(':');
      
      const cashbox = await this.prisma.cashbox.findFirst({
          where: { public_id: publicId, api_secret: apiSecret, is_active: true },
      });
      
      if (!cashbox) {
          throw new UnauthorizedException();
      }
      
      return await this.paymentsService.getTransactionsListV2(dto, cashbox.id);
  }
}
