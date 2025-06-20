import { reasonCodes, cardHolderMessages } from '../var/reason-codes.object.var';

interface IData {
  ReasonCode?: number;
  Pan?: string;
  PublicId?: string;
  TransactionId?: number;
  Amount?: number;
  InvoiceId?: string;
  AccountId?: string;
  Description?: string;
  Date?: any;
  IpAddress?: string;
  IpCountry?: string;
  IpCity?: string;
  IpRegion?: string;
  CardExpDate?: string;
  CardType?: string;
  Status?: string;
  Reason?: string;
  CardHolderMessage?: string;
  Refunded?: boolean;
  Name?: string;
  Token?: string;
  GatewayName?: string;
  Success?: boolean;
  JsonData?: any;
}

interface ISuccess {
  Pan: string;
  PublicId: string;
  TransactionId: number;
  Amount: number;
  InvoiceId: string;
  AccountId: string;
  Description: string;
  Date: Date;
  IpAddress: string;
  IpCountry: string;
  IpCity: string;
  IpRegion: string;
  CardExpDate: string;
  CardType: string;
  Name: string;
  Token: string;
  GatewayName: string;
  Status?: string;
  JsonData?: any;
}

interface IInsufficientFunds {
  Pan: string;
  PublicId: string;
  TransactionId: number;
  Amount: number;
  InvoiceId: string;
  AccountId: string;
  Description: string;
  Date: Date;
  IpAddress: string;
  IpCountry: string;
  IpCity: string;
  IpRegion: string;
  CardExpDate: string;
  CardType: string;
  Name: string;
  Token: string;
  GatewayName: string;
}

interface INoSuchIssuer {
  Amount: number;
  Date: Date;
  Description: string;
  InvoiceId: string;
  AccountId: string;
  Token: string;
}

interface IDoNotHonor {
  AccountId: string;
  Amount: number;
  CardExpDate: string;
  CardType: string;
  Description: string;
  GatewayName: string;
  InvoiceId: string;
  Name: string;
  Pan: string;
  PublicId: string;
  Token: string;
  TransactionId: number;
}

export class CoreApiResponse {
  Model: {
    ReasonCode: number;
    PublicId: string;
    TerminalUrl: string;
    TransactionId: number;
    Amount: number;
    Currency: string;
    CurrencyCode: number;
    PaymentAmount: number;
    PaymentCurrency: string;
    PaymentCurrencyCode?: any;
    InvoiceId: string;
    AccountId: string;
    Email?: any;
    Description?: string;
    JsonData?: any;
    CreatedDate?: string;
    PayoutDate?: any;
    PayoutDateIso?: any;
    PayoutAmount?: any;
    CreatedDateIso?: string;
    AuthDate?: any;
    AuthDateIso?: any;
    ConfirmDate?: any;
    ConfirmDateIso?: any;
    AuthCode?: any;
    TestMode: boolean;
    Rrn?: any;
    OriginalTransactionId?: any;
    FallBackScenarioDeclinedTransactionId?: any;
    IpAddress: string;
    IpCountry: string;
    IpCity: string;
    IpRegion: string;
    IpDistrict?: any;
    IpLatitude?: any;
    IpLongitude?: any;
    CardFirstSix: string;
    CardLastFour: string;
    CardExpDate: string;
    CardType: string;
    CardProduct?: any;
    CardCategory?: any;
    EscrowAccumulationId?: null;
    IssuerBankCountry?: any;
    Issuer?: null;
    CardTypeCode?: any;
    Status: string;
    StatusCode?: any;
    CultureName?: string;
    Reason: string;
    CardHolderMessage: string;
    Type: number;
    Refunded: boolean;
    Name: string;
    Token: string;
    SubscriptionId: null;
    GatewayName: string;
    ApplePay: boolean;
    AndroidPay: boolean;
    WalletType: string;
    TotalFee: number;
    IsLocalOrder: boolean;
    Gateway: number;
    MasterPass: boolean;
    InfoShopData: null;
  };
  Success: boolean;
  Message: null;

  constructor(data: IData) {
    const date = new Date();
    const cardExp = data.CardExpDate
      ? data.CardExpDate.substring(2) + '/' + data.CardExpDate.substring(0, 2)
      : null;
    
    // Получаем причину и сообщение для плательщика из справочников
    const reason = data.Reason || reasonCodes[data.ReasonCode] || 'Unknown';
    const cardHolderMessage = data.CardHolderMessage || 
      cardHolderMessages[data.ReasonCode] || 'Ошибка обработки платежа';

    const Model = {
      ReasonCode: data.ReasonCode || 0,
      PublicId: data.PublicId || null,
      TerminalUrl: 'https://pay.dnsc.uz',
      CurrencyCode: 860,
      PaymentCurrencyCode: 0,
      Email: null,
      JsonData: data.JsonData,
      PayoutDate: null,
      PayoutDateIso: null,
      PayoutAmount: null,
      AuthDate: null,
      AuthDateIso: null,
      ConfirmDate: null,
      ConfirmDateIso: null,
      AuthCode: null,
      TestMode: false,
      Rrn: null,
      OriginalTransactionId: null,
      FallBackScenarioDeclinedTransactionId: null,
      IpDistrict: 'Ташкент',
      IpLatitude: 0,
      IpLongitude: 0,
      CardProduct: null,
      CardCategory: 'Не определен ()',
      EscrowAccumulationId: null,
      IssuerBankCountry: 'UZ',
      Issuer: null,
      CardTypeCode: 16,
      StatusCode: 3,
      CultureName: 'uz',
      Type: 0,
      SubscriptionId: null,
      ApplePay: false,
      AndroidPay: false,
      WalletType: '',
      TotalFee: 0,
      IsLocalOrder: false,
      Gateway: 53,
      MasterPass: false,
      InfoShopData: null,
      TransactionId: data.TransactionId || null,
      Amount: data.Amount || null,
      Currency: 'UZS',
      PaymentAmount: data.Amount || null,
      PaymentCurrency: 'UZS',
      InvoiceId: data.InvoiceId || null,
      AccountId: data.AccountId || null,
      Description: data.Description || null,
      CreatedDate: `/Date(${date.getTime()})/` || null,
      CreatedDateIso: date?.toISOString()?.replace('Z', '') || null,
      IpAddress: data.IpAddress || null,
      IpCountry: data.IpCountry || null,
      IpCity: data.IpCity || null,
      IpRegion: data.IpRegion || null,
      CardFirstSix: data.Pan ? data.Pan.slice(0, 6) : null,
      CardLastFour: data.Pan ? data.Pan.slice(-4) : null,
      CardExpDate: cardExp || null,
      CardType: data.CardType || null,
      Status: data.Status || null,
      Reason: reason,
      CardHolderMessage: cardHolderMessage,
      Refunded: data.Refunded || null,
      Name: data.Name || null,
      Token: data.Token || null,
      GatewayName: data.GatewayName || null,
    };
    this.Model = { ...this.Model, ...Model };
    this.Success = data.Success;
    this.Message = null;
  }

  static success(successData: ISuccess) {
    return new CoreApiResponse({
      AccountId: successData.AccountId,
      Amount: successData.Amount,
      CardExpDate: successData.CardExpDate,
      CardType: successData.CardType,
      Date: successData.Date.toISOString().replace('T', ' ').replace('Z', ''),
      Description: successData.Description,
      GatewayName: successData.GatewayName,
      InvoiceId: successData.InvoiceId,
      IpAddress: successData.IpAddress,
      IpCity: successData.IpCity,
      IpCountry: successData.IpCountry,
      IpRegion: successData.IpRegion,
      Name: successData.Name,
      Pan: successData.Pan,
      PublicId: successData.PublicId,
      ReasonCode: 0,
      Refunded: false,
      Status: 'Completed',
      Success: true,
      Token: successData.Token,
      TransactionId: successData.TransactionId,
    });
  }

  static insufficentFunds(data: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5051,
      Refunded: false,
      Status: 'Declined',
      Success: false,
    });
  }

  static issuerNotFound(data: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5015,
      Refunded: false,
      Status: 'Declined',
      Success: false,
    });
  }

  static doNotHonor(data: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5005,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Date: new Date(),
    });
  }

  static hold(successData: ISuccess) {
    return new CoreApiResponse({
      ...successData,
      ReasonCode: 0,
      Refunded: false,
      Status: 'Authorized',
      Success: true,
      Date: successData.Date.toISOString().replace('T', ' ').replace('Z', ''),
    });
  }

  static wrongCryptogram() {
    return new CoreApiResponse({
      ReasonCode: 7000,
      Status: 'Declined',
      Success: false,
    });
  }

  static secure3d() {
    return new CoreApiResponse({
      ReasonCode: 5206,
      Refunded: false,
      Status: 'Declined',
      Success: false,
    });
  }

  static pending(transactionId: number) {
    return new CoreApiResponse({
      ReasonCode: 5000,
      Refunded: false,
      Status: 'Pending',
      Success: false,
      TransactionId: transactionId,
    });
  }

  static notPermitted() {
    return new CoreApiResponse({
      ReasonCode: 5057,
      Success: false,
    });
  }

  static invalidErrorCode() {
    return new CoreApiResponse({
      ReasonCode: 6002,
      Success: false,
    });
  }

  static cardExpired(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5054,
      Status: 'Declined',
      Success: false,
    });
  }
static fraudSuspected(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5034,
      Status: 'Declined', 
      Success: false,
    });
  }

  static incorrectCVV(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5082,
      Status: 'Declined',
      Success: false,
    });
  }

  static restrictedCard(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5036,
      Status: 'Declined',
      Success: false,
    });
  }

  static timeout() {
    return new CoreApiResponse({
      ReasonCode: 5091,
      Status: 'Declined',
      Success: false,
    });
  }

  static systemError() {
    return new CoreApiResponse({
      ReasonCode: 5096,
      Status: 'Declined', 
      Success: false,
    });
  }

  static amountError(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5013,
      Status: 'Declined',
      Success: false,
    });
  }

  static invalidCardNumber(data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: 5014,
      Status: 'Declined',
      Success: false,
    });
  }

    static errorByCode(code: number, data?: any) {
    return new CoreApiResponse({
      ...data,
      ReasonCode: code,
      Status: 'Declined',
      Success: false,
    });
  }
}
