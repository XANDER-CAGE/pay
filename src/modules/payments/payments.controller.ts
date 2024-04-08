import {
  Controller,
  Get,
  Post,
  InternalServerErrorException,
  UseGuards,
  Body,
  Req,
  HttpException,
  HttpStatus,
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

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly antiFraudservice: AntifraudService,
  ) {}

  @UseGuards(AuthGuard)
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
    return this.paymentsService.charge(dto, req);
  }

  @Post('cards/post3ds')
  async post3ds(@Body() dto: Handle3dsPostDto) {
    const response = await this.paymentsService.handle3DSPost(dto);
    console.log('mockedResponse: ', response);
    return response;
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
  async refund(@Body() dto: RefundDto) {
    return await this.paymentsService.refund(dto);
  }

  @UseGuards(AuthGuard)
  @Post('tokens/charge')
  async payByToken(@Body() dto: PayByTokenDto, @Req() req: MyReq) {
    const response = await this.paymentsService.payByToken(dto, req);
    console.log('mockedResponse: ', response);
    return response;
  }

  @Post('invoice')
  async invoice(@Body('invoiceId') invoiceId: string) {
    return await this.paymentsService.getDataByByInvoiceId(invoiceId);
  }
}
