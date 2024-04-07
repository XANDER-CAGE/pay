interface IData {
  ReasonCode: number;
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
  Status: string;
  Reason: string;
  CardHolderMessage: string;
  Refunded: boolean;
  Name: string;
  Token: string;
  GatewayName: string;
  Success: boolean;
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

export class CoreApiResponse {
  Model: {
    ReasonCode: number;
    PublicId: string;
    TerminalUrl: 'https://pay.dnsc.uz';
    TransactionId: number;
    Amount: number;
    Currency: string;
    CurrencyCode: 860;
    PaymentAmount: number;
    PaymentCurrency: string;
    PaymentCurrencyCode: 0;
    InvoiceId: string;
    AccountId: string;
    Email: null;
    Description: string;
    JsonData: null;
    CreatedDate: string;
    PayoutDate: null;
    PayoutDateIso: null;
    PayoutAmount: null;
    CreatedDateIso: string;
    AuthDate: null;
    AuthDateIso: null;
    ConfirmDate: null;
    ConfirmDateIso: null;
    AuthCode: null;
    TestMode: false;
    Rrn: null;
    OriginalTransactionId: null;
    FallBackScenarioDeclinedTransactionId: null;
    IpAddress: string;
    IpCountry: string;
    IpCity: string;
    IpRegion: string;
    IpDistrict: 'Ташкент';
    IpLatitude: 0;
    IpLongitude: 0;
    CardFirstSix: string;
    CardLastFour: string;
    CardExpDate: string;
    CardType: string;
    CardProduct: null;
    CardCategory: 'Не определен ()';
    EscrowAccumulationId: null;
    IssuerBankCountry: 'UZ';
    Issuer: null;
    CardTypeCode: 16;
    Status: string;
    StatusCode: 5;
    CultureName: 'uz';
    Reason: string;
    CardHolderMessage: string;
    Type: 0;
    Refunded: boolean;
    Name: string;
    Token: string;
    SubscriptionId: null;
    GatewayName: string;
    ApplePay: false;
    AndroidPay: false;
    WalletType: '';
    TotalFee: 0;
    IsLocalOrder: false;
    Gateway: 53;
    MasterPass: false;
    InfoShopData: null;
  };
  Success: boolean;
  Message: null;
  ErrorCode: null;

  constructor(data: IData) {
    const date = new Date(data.Date);
    const cardExp = data.CardExpDate
      ? data.CardExpDate.substring(2) + '/' + data.CardExpDate.substring(0, 2)
      : null;
    this.Success = data.Success;
    this.Model.ReasonCode = data.ReasonCode;
    this.Model.PublicId = data.PublicId;
    this.Model.TransactionId = data.TransactionId;
    this.Model.Amount = data.Amount;
    this.Model.Currency = 'UZS';
    this.Model.PaymentAmount = data.Amount;
    this.Model.PaymentCurrency = 'UZS';
    this.Model.InvoiceId = data.InvoiceId;
    this.Model.AccountId = data.AccountId;
    this.Model.Description = data.Description;
    this.Model.CreatedDate = `/Date(${date.getTime()})/`;
    this.Model.CreatedDateIso = date.toISOString();
    this.Model.IpAddress = data.IpAddress;
    this.Model.IpCountry = data.IpCountry;
    this.Model.IpCity = data.IpCity;
    this.Model.IpRegion = data.IpRegion;
    this.Model.CardFirstSix = data.Pan ? data.Pan.slice(0, 6) : null;
    this.Model.CardLastFour = data.Pan ? data.Pan.slice(-4) : null;
    this.Model.CardExpDate = cardExp;
    this.Model.CardType = data.CardType;
    this.Model.Status = data.Status;
    this.Model.Reason = data.Reason;
    this.Model.CardHolderMessage = data.CardHolderMessage;
    this.Model.Refunded = data.Refunded;
    this.Model.Name = data.Name;
    this.Model.Token = data.Token;
    this.Model.GatewayName = data.GatewayName;
  }

  static success(successData: ISuccess) {
    return new CoreApiResponse({
      AccountId: successData.AccountId,
      Amount: successData.Amount,
      CardExpDate: successData.CardExpDate,
      CardHolderMessage: 'Оплата успешно проведена',
      CardType: successData.CardType,
      Date: successData.Date,
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
      Reason: 'Approved',
      ReasonCode: 0,
      Refunded: false,
      Status: 'Completed',
      Success: true,
      Token: successData.Token,
      TransactionId: successData.TransactionId,
    });
  }

  static insufficentFunds(data: IInsufficientFunds) {
    return new CoreApiResponse({
      AccountId: data.AccountId,
      Amount: data.Amount,
      CardExpDate: data.CardExpDate,
      CardHolderMessage: 'Недостаточно средств на карте',
      CardType: data.CardType,
      Date: data.Date,
      Description: data.Description,
      GatewayName: data.GatewayName,
      InvoiceId: data.InvoiceId,
      IpAddress: data.IpAddress,
      IpCity: data.IpCity,
      IpCountry: data.IpCountry,
      IpRegion: data.IpRegion,
      Name: data.Name,
      Pan: data.Pan,
      PublicId: data.PublicId,
      Reason: 'InsufficientFunds',
      ReasonCode: 5051,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Token: data.Token,
      TransactionId: data.TransactionId,
    });
  }

  static issuerNotFound(data: INoSuchIssuer) {
    return new CoreApiResponse({
      AccountId: data.AccountId,
      Amount: data.Amount,
      CardExpDate: null,
      CardHolderMessage: 'Токен карты не найден',
      CardType: null,
      Date: data.Date,
      Description: data.Description,
      GatewayName: null,
      InvoiceId: data.InvoiceId,
      IpAddress: null,
      IpCity: null,
      IpCountry: null,
      IpRegion: null,
      Name: null,
      Pan: null,
      PublicId: null,
      Reason: 'No such issuer',
      ReasonCode: 5015,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Token: data.Token,
      TransactionId: 0,
    });
  }
}
