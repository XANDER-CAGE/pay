interface IData {
  ReasonCode?: number;
  Pan?: string;
  PublicId?: string;
  TransactionId?: number;
  Amount?: number;
  InvoiceId?: string;
  AccountId?: string;
  Description?: string;
  Date?: Date;
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
    const Model = {
      ReasonCode: data.ReasonCode || null,
      PublicId: data.PublicId || null,
      TerminalUrl: 'https://pay.dnsc.uz',
      CurrencyCode: 860,
      PaymentCurrencyCode: 0,
      Email: null,
      JsonData: null,
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
      StatusCode: 5,
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
      CreatedDateIso: date.toISOString() || null,
      IpAddress: data.IpAddress || null,
      IpCountry: data.IpCountry || null,
      IpCity: data.IpCity || null,
      IpRegion: data.IpRegion || null,
      CardFirstSix: data.Pan ? data.Pan.slice(0, 6) : null,
      CardLastFour: data.Pan ? data.Pan.slice(-4) : null,
      CardExpDate: cardExp || null,
      CardType: data.CardType || null,
      Status: data.Status || null,
      Reason: data.Reason || null,
      CardHolderMessage: data.CardHolderMessage || null,
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
      CardHolderMessage: 'Токен карты не найден',
      Date: data.Date,
      Description: data.Description,
      InvoiceId: data.InvoiceId,
      Reason: 'No such issuer',
      ReasonCode: 5015,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Token: data.Token,
    });
  }

  static doNotHonor(data: IDoNotHonor) {
    return new CoreApiResponse({
      AccountId: data.AccountId,
      Amount: data.Amount,
      CardExpDate: data.CardExpDate,
      CardHolderMessage:
        'Свяжитесь с вашим банком или воспользуйтесь другой картой',
      CardType: data.CardType,
      Date: new Date(),
      Description: data.Description,
      GatewayName: data.GatewayName,
      InvoiceId: data.InvoiceId,
      Name: data.Name,
      Pan: data.Pan,
      PublicId: data.PublicId,
      Reason: 'DoNotHonor',
      ReasonCode: 5005,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Token: data.Token,
      TransactionId: data.TransactionId,
    });
  }

  static hold(data: ISuccess) {
    return new CoreApiResponse({
      AccountId: data.AccountId,
      Amount: data.Amount,
      CardExpDate: data.CardExpDate,
      CardHolderMessage: 'Холдирование успешно авторизован',
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
      Reason: 'Approved',
      ReasonCode: 0,
      Refunded: false,
      Status: 'Authorized',
      Success: true,
      Token: data.Token,
      TransactionId: data.TransactionId,
    });
  }

  static wrongCryptogram() {
    return new CoreApiResponse({
      CardHolderMessage: 'Неправильная криптограмма',
      Reason: 'Wrong cryptogram packet',
      ReasonCode: 7000,
      Status: 'Declined',
      Success: false,
    });
  }

  // TODO: review returning data
  static secure3d() {
    return new CoreApiResponse({
      AccountId: null,
      Amount: null,
      CardExpDate: null,
      CardHolderMessage: '3-D Secure авторизация не пройдена',
      CardType: null,
      Date: null,
      Description: null,
      GatewayName: null,
      InvoiceId: null,
      IpAddress: null,
      IpCity: null,
      IpCountry: null,
      IpRegion: null,
      Name: null,
      Pan: null,
      PublicId: null,
      Reason: 'Authentication failed',
      ReasonCode: 5206,
      Refunded: false,
      Status: 'Declined',
      Success: false,
      Token: null,
      TransactionId: null,
    });
  }

  // TODO: review returning data
  static pending(transactionId: number) {
    return new CoreApiResponse({
      AccountId: null,
      Amount: null,
      CardExpDate: null,
      CardHolderMessage: 'Транзакция в процессе',
      CardType: null,
      Date: null,
      Description: null,
      GatewayName: null,
      InvoiceId: null,
      IpAddress: null,
      IpCity: null,
      IpCountry: null,
      IpRegion: null,
      Name: null,
      Pan: null,
      PublicId: null,
      Reason: 'Transaction is processing',
      ReasonCode: 5000,
      Refunded: false,
      Status: 'Pending',
      Success: false,
      Token: null,
      TransactionId: transactionId,
    });
  }

  static notPermitted() {
    return new CoreApiResponse({
      CardHolderMessage: 'карта заблокирована или еще не активирована',
      Reason: 'Transaction Not Permitted',
      ReasonCode: 5057,
      Success: false,
    });
  }

  static invalidErrorCode() {
    return new CoreApiResponse({
      CardHolderMessage: 'Некорректное значение code',
      Reason: 'InvalidErrorCode',
      ReasonCode: 6002,
      Success: false,
    });
  }
}
