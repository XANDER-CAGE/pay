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
    console.log('post3ds dto: ', dto);
    const response = await this.paymentsService.handle3DSPost(dto);
    console.log('post3ds response: ', response);
    const mockedResponse = {
      Model: {
        ReasonCode: 0,
        PublicId: 'pk_d585361d99efe48b385867369ce08',
        TerminalUrl: 'http://test.urentbike.ru',
        TransactionId: response.TransactionId,
        Amount: response.Amount,
        Currency: 'RUB',
        CurrencyCode: 0,
        PaymentAmount: 15,
        PaymentCurrency: 'RUB',
        PaymentCurrencyCode: 0,
        InvoiceId: response.InvoiceId,
        AccountId: '614dbc61e2134c1d002a0f25',
        Email: null,
        Description: 'Привязка банковской карты',
        JsonData:
          '{"phone":"79293066424","ConnectumParams":{"Phone":"79293066424"}}',
        CreatedDate: '/Date(1709534757900)/',
        PayoutDate: null,
        PayoutDateIso: null,
        PayoutAmount: null,
        CreatedDateIso: '2024-03-04T06:45:57',
        AuthDate: '/Date(1709534773412)/',
        AuthDateIso: '2024-03-04T06:46:13',
        ConfirmDate: '/Date(1709534773412)/',
        ConfirmDateIso: '2024-03-04T06:46:13',
        AuthCode: 'A1B2C3',
        TestMode: true,
        Rrn: null,
        OriginalTransactionId: null,
        FallBackScenarioDeclinedTransactionId: null,
        IpAddress: '178.154.215.215',
        IpCountry: 'RU',
        IpCity: 'Москва',
        IpRegion: 'Москва',
        IpDistrict: 'Москва',
        IpLatitude: 55.75222,
        IpLongitude: 37.61556,
        CardFirstSix: '555555',
        CardLastFour: '4444',
        CardExpDate: '12/25',
        CardType: 'MasterCard',
        CardProduct: '',
        CardCategory: 'Не определен ()',
        EscrowAccumulationId: null,
        IssuerBankCountry: 'RU',
        Issuer: 'TINKOFF',
        CardTypeCode: 1,
        Status: response.Status,
        StatusCode: 3,
        CultureName: 'ru-RU',
        Reason: 'Approved',
        CardHolderMessage: 'Оплата успешно проведена',
        Type: 0,
        Refunded: false,
        Name: null,
        Token: 'tk_85f8331b55038b64a07a157f09b97',
        SubscriptionId: null,
        GatewayName: 'Test',
        ApplePay: false,
        AndroidPay: false,
        WalletType: '',
        TotalFee: 0,
        IsLocalOrder: false,
        Gateway: 0,
        MasterPass: false,
        InfoShopData: null,
      },
      Success: true,
      Message: null,
      ErrorCode: null,
    };

    // const mockedResponse = {
    //   Model: {
    //     ReasonCode: 0, // отправляем ошибку
    //     PublicId: response.PublicId, //username кассы
    //     TerminalUrl: 'https://pay.dnsc.uz', //url терминала
    //     TransactionId: response.TransactionId, //id транзы
    //     Amount: response.Amount, // сумма
    //     Currency: response.Currency, //валюта
    //     CurrencyCode: 860, //код валюты
    //     PaymentAmount: response.Amount, //сумма
    //     PaymentCurrency: response.Currency, // сумма
    //     PaymentCurrencyCode: 0,
    //     InvoiceId: response.InvoiceId,
    //     AccountId: response.AccountId, //айди аккаунта
    //     Email: null, //мыло кассы
    //     Description: 'Оплата товаров в example.com', //описание
    //     JsonData: null,
    //     //"JsonData": "{\"CloudPayments\":{\"CustomerReceipt\":{\"Items\":[{\"label\":\"Пластырь\",\"price\":1000,\"quantity\":1,\"amount\":1000,\"vat\":12,\"spic\":\"02009001006000000\",\"packageCode\":\"780030110035\"}]}}}",
    //     CreatedDate: `/Date(${response.CreatedDate})/`, //дата создания
    //     PayoutDate: null,
    //     PayoutDateIso: null,
    //     PayoutAmount: null,
    //     CreatedDateIso: response.CreatedDateIso,
    //     AuthDate: null,
    //     AuthDateIso: null,
    //     ConfirmDate: null,
    //     ConfirmDateIso: null,
    //     AuthCode: null,
    //     TestMode: false,
    //     Rrn: null,
    //     OriginalTransactionId: null,
    //     FallBackScenarioDeclinedTransactionId: null,
    //     IpAddress: response.IpAddress,
    //     IpCountry: response.IpCountry,
    //     IpCity: response.IpCity,
    //     IpRegion: response.IpRegion,
    //     IpDistrict: 'Ташкент',
    //     IpLatitude: 0,
    //     IpLongitude: 0,
    //     CardFirstSix: response.CardFirstSix,
    //     CardLastFour: response.CardLastFour,
    //     CardExpDate: response.CardExpDate,
    //     CardType: response.CardType,
    //     CardProduct: null,
    //     CardCategory: 'Не определен ()',
    //     EscrowAccumulationId: null,
    //     IssuerBankCountry: 'UZ',
    //     Issuer: null,
    //     CardTypeCode: 16,
    //     Status: response.Status,
    //     StatusCode: 5,
    //     CultureName: 'uz',
    //     Reason: 'Approved',
    //     CardHolderMessage: 'Insufficient funds',
    //     Type: 0,
    //     Refunded: false,
    //     Name: response.CardHolderName,
    //     Token: response.CardToken,
    //     SubscriptionId: null,
    //     GatewayName: response.BankName,
    //     ApplePay: false,
    //     AndroidPay: false,
    //     WalletType: '',
    //     TotalFee: 0,
    //     IsLocalOrder: false,
    //     Gateway: 53,
    //     MasterPass: false,
    //     InfoShopData: null,
    //   },
    //   Success: response.Success || false,
    //   Message: null,
    //   ErrorCode: null,
    // };
    console.log('post3ds mockedResponse: ', mockedResponse);

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
}
