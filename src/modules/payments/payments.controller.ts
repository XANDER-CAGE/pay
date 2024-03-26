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
    const isFraud = await this.antiFraudservice.checkForFraud(
      req.ip,
      dto.Amount,
    );
    if (isFraud) {
      throw new HttpException(
        "'Suspicious transaction detected. Payment declined.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return this.paymentsService.charge(dto, req);
  }

  @Post('cards/post3ds')
  async post3ds(@Body() dto: Handle3dsPostDto) {
    const response = await this.paymentsService.handle3DSPost(dto);
    const cardExp =
      response.CardExpDate.substring(2) +
      '/' +
      response.CardExpDate.substring(0, 2);
    const mockedResponse = {
      Model: {
        ReasonCode: 0, // отправляем ошибку
        PublicId: response.PublicId, //username кассы
        TerminalUrl: 'https://pay.dnsc.uz', //url терминала
        TransactionId: response.TransactionId, //id транзы
        Amount: response.Amount, // сумма
        Currency: response.Currency, //валюта
        CurrencyCode: 860, //код валюты
        PaymentAmount: response.Amount, //сумма
        PaymentCurrency: response.Currency, // сумма
        PaymentCurrencyCode: 0,
        InvoiceId: response.InvoiceId,
        AccountId: response.AccountId, //айди аккаунта
        Email: null, //мыло кассы
        Description: 'Оплата товаров в example.com', //описание
        JsonData: null,
        //"JsonData": "{\"CloudPayments\":{\"CustomerReceipt\":{\"Items\":[{\"label\":\"Пластырь\",\"price\":1000,\"quantity\":1,\"amount\":1000,\"vat\":12,\"spic\":\"02009001006000000\",\"packageCode\":\"780030110035\"}]}}}",
        CreatedDate: `/Date(${response.CreatedDate})/`, //дата создания
        PayoutDate: null,
        PayoutDateIso: null,
        PayoutAmount: null,
        CreatedDateIso: response.CreatedDateIso,
        AuthDate: null,
        AuthDateIso: null,
        ConfirmDate: null,
        ConfirmDateIso: null,
        AuthCode: null,
        TestMode: false,
        Rrn: null,
        OriginalTransactionId: null,
        FallBackScenarioDeclinedTransactionId: null,
        IpAddress: response.IpAddress,
        IpCountry: response.IpCountry,
        IpCity: response.IpCity,
        IpRegion: response.IpRegion,
        IpDistrict: 'Ташкент',
        IpLatitude: 0,
        IpLongitude: 0,
        CardFirstSix: response.CardFirstSix,
        CardLastFour: response.CardLastFour,
        CardExpDate: cardExp,
        CardType: response.CardType,
        CardProduct: null,
        CardCategory: 'Не определен ()',
        EscrowAccumulationId: null,
        IssuerBankCountry: 'UZ',
        Issuer: null,
        CardTypeCode: 16,
        Status: response.Status,
        StatusCode: 5,
        CultureName: 'uz',
        Reason: response.Reason || null,
        CardHolderMessage: 'Insufficient funds',
        Type: 0,
        Refunded: false,
        Name: response.CardHolderName,
        Token: response.CardToken,
        SubscriptionId: null,
        GatewayName: response.BankName,
        ApplePay: false,
        AndroidPay: false,
        WalletType: '',
        TotalFee: 0,
        IsLocalOrder: false,
        Gateway: 53,
        MasterPass: false,
        InfoShopData: null,
      },
      Success: response.Success || false,
      Message: null,
      ErrorCode: null,
    };
    console.log('mockedResponse: ', mockedResponse);

    return mockedResponse;
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

  @Post('tokens/charge')
  async payByToken(@Body() dto: PayByTokenDto, @Req() req: MyReq) {
    const response = await this.paymentsService.payByToken(dto, req);
    const mockedResponse = {
      Model: {
        ReasonCode: 0, // отправляем ошибку
        PublicId: response.PublicId, //username кассы
        TerminalUrl: 'https://pay.dnsc.uz', //url терминала
        TransactionId: response.TransactionId, //id транзы
        Amount: response.Amount, // сумма
        Currency: response.Currency, //валюта
        CurrencyCode: 860, //код валюты
        PaymentAmount: response.Amount, //сумма
        PaymentCurrency: response.Currency, // сумма
        PaymentCurrencyCode: 0,
        InvoiceId: response.InvoiceId,
        AccountId: response.AccountId, //айди аккаунта
        Email: null, //мыло кассы
        Description: 'Оплата товаров в example.com', //описание
        JsonData: null,
        //"JsonData": "{\"CloudPayments\":{\"CustomerReceipt\":{\"Items\":[{\"label\":\"Пластырь\",\"price\":1000,\"quantity\":1,\"amount\":1000,\"vat\":12,\"spic\":\"02009001006000000\",\"packageCode\":\"780030110035\"}]}}}",
        CreatedDate: `/Date(${response.CreatedDate})/`, //дата создания
        PayoutDate: null,
        PayoutDateIso: null,
        PayoutAmount: null,
        CreatedDateIso: response.CreatedDateIso,
        AuthDate: null,
        AuthDateIso: null,
        ConfirmDate: null,
        ConfirmDateIso: null,
        AuthCode: null,
        TestMode: false,
        Rrn: null,
        OriginalTransactionId: null,
        FallBackScenarioDeclinedTransactionId: null,
        IpAddress: response.IpAddress,
        IpDistrict: 'Ташкент',
        IpLatitude: 0,
        IpLongitude: 0,
        CardFirstSix: response.CardFirstSix,
        CardLastFour: response.CardLastFour,
        CardExpDate: response.CardExpDate,
        CardType: response.CardType,
        CardProduct: null,
        CardCategory: 'Не определен ()',
        EscrowAccumulationId: null,
        IssuerBankCountry: 'UZ',
        Issuer: null,
        CardTypeCode: 16,
        Status: response.Status,
        StatusCode: 5,
        CultureName: 'uz',
        Reason: response.Reason || null,
        CardHolderMessage: 'Insufficient funds',
        Type: 0,
        Refunded: false,
        Name: response.CardHolderName,
        Token: response.CardToken,
        SubscriptionId: null,
        GatewayName: response.BankName,
        ApplePay: false,
        AndroidPay: false,
        WalletType: '',
        TotalFee: 0,
        IsLocalOrder: false,
        Gateway: 53,
        MasterPass: false,
        InfoShopData: null,
      },
      Success: response.Success || false,
      Message: null,
      ErrorCode: null,
    };
    console.log('mockedResponse: ', mockedResponse);

    return mockedResponse;
  }
}
