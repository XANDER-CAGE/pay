import { card, transaction, ip } from '@prisma/client';
import { reasonCodes } from 'src/common/var/reascon-code.object.var';

export type OperationType = 'Payment' | 'Refund' | 'CardPayout';

// Базовый класс для всех уведомлений
export class BaseHookDto {
  TransactionId: number;
  Amount: number;
  Currency: string;
  PaymentAmount: string;
  PaymentCurrency: string;
  DateTime: string;
  CardId?: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardType: string;
  CardExpDate: string;
  TestMode: boolean;
  Status: string;
  OperationType: string;
  InvoiceId?: string;
  AccountId?: string;
  SubscriptionId?: string;
  TokenRecipient?: string;
  Name?: string;
  Email?: string;
  IpAddress?: string;
  IpCountry?: string;
  IpCity?: string;
  IpRegion?: string;
  IpDistrict?: string;
  IpLatitude?: string;
  IpLongitude?: string;
  Issuer?: string;
  IssuerBankCountry?: string;
  Description?: string;
  CardProduct?: string;
  PaymentMethod?: string;
  Data?: string;
  Token?: string;
  CustomFields?: any[];

  constructor(
    transaction: transaction,
    card: card,
    operationType: OperationType,
    ip?: ip,
    jsonData?: any,
  ) {
    const cardExp = card?.expiry 
      ? card.expiry.substring(2) + '/' + card.expiry.substring(0, 2)
      : null;

    this.TransactionId = transaction.id;
    this.Amount = Number(transaction.amount);
    this.Currency = 'UZS';
    this.PaymentAmount = String(transaction.amount);
    this.PaymentCurrency = '860';
    this.DateTime = transaction.created_at
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .split('.')[0];
    this.CardId = card ? String(card.id) : undefined;
    this.CardFirstSix = card?.pan.slice(0, 6);
    this.CardLastFour = card?.pan.slice(-4);
    this.CardType = card?.processing;
    this.CardExpDate = cardExp;
    this.TestMode = transaction.is_test || false;
    this.Status = transaction.status;
    this.OperationType = operationType;
    this.InvoiceId = transaction.invoice_id;
    this.AccountId = transaction.account_id;
    this.SubscriptionId = null; // Пока не поддерживается
    this.TokenRecipient = null;
    this.Name = card?.fullname;
    this.Email = null; // Нужно добавить в транзакцию
    this.IpAddress = ip?.ip_address;
    this.IpCountry = ip?.countryCode;
    this.IpCity = ip?.city;
    this.IpRegion = ip?.region;
    this.IpDistrict = ip?.regionName;
    this.IpLatitude = ip?.lat ? String(ip.lat) : null;
    this.IpLongitude = ip?.lon ? String(ip.lon) : null;
    this.Issuer = card?.bank_name;
    this.IssuerBankCountry = 'UZ';
    this.Description = transaction.description;
    this.CardProduct = null;
    this.PaymentMethod = null;
    this.Data = jsonData ? JSON.stringify(jsonData) : null;
    this.Token = card?.tk;
    this.CustomFields = [];
  }
}

// Check уведомление
export class CheckHookDto extends BaseHookDto {
  constructor(
    transaction: transaction,
    card: card,
    ip?: ip,
    jsonData?: any,
  ) {
    super(transaction, card, 'Payment', ip, jsonData);
  }
}

// Pay уведомление
export class PayHookDto extends BaseHookDto {
  GatewayName: string;
  AuthCode?: string;
  TotalFee?: number;
  FallBackScenarioDeclinedTransactionId?: number;
  Rrn?: string;

  constructor(
    transaction: transaction,
    card: card,
    ip?: ip,
    jsonData?: any,
  ) {
    super(transaction, card, 'Payment', ip, jsonData);
    this.GatewayName = card?.bank_name || 'unknown';
    this.AuthCode = transaction.status === 'Completed' || transaction.status === 'Authorized' 
      ? 'A1B2C3' : null;
    this.TotalFee = 0;
    this.FallBackScenarioDeclinedTransactionId = null;
    this.Rrn = transaction.processing_ref_num;
  }
}

// Fail уведомление
export class FailHookDto extends BaseHookDto {
  Reason: string;
  ReasonCode: number;
  FallBackScenarioDeclinedTransactionId?: number;
  Rrn?: string;

  constructor(
    transaction: transaction,
    card: card,
    ip?: ip,
    jsonData?: any,
  ) {
    super(transaction, card, 'Payment', ip, jsonData);
    this.ReasonCode = transaction.reason_code || null;
    this.Reason = reasonCodes[transaction.reason_code] || null;
    this.FallBackScenarioDeclinedTransactionId = null;
    this.Rrn = transaction.processing_ref_num;
  }
}

// Confirm уведомление
export class ConfirmHookDto extends BaseHookDto {
  AuthCode?: string;
  Rrn?: string;

  constructor(
    transaction: transaction,
    card: card,
    ip?: ip,
    jsonData?: any,
  ) {
    super(transaction, card, 'Payment', ip, jsonData);
    this.AuthCode = 'A1B2C3';
    this.Rrn = transaction.processing_ref_num;
    this.Status = 'Completed';
  }
}

// Refund уведомление
export class RefundHookDto {
  TransactionId: number;
  PaymentTransactionId: number;
  Amount: number;
  DateTime: string;
  OperationType: string;
  InvoiceId?: string;
  AccountId?: string;
  Email?: string;
  Data?: string;
  Rrn?: string;
  CustomFields?: any[];

  constructor(
    refundTransaction: transaction,
    originalTransaction: transaction,
    jsonData?: any,
  ) {
    this.TransactionId = refundTransaction.id;
    this.PaymentTransactionId = originalTransaction.id;
    this.Amount = Number(refundTransaction.amount || originalTransaction.amount);
    this.DateTime = refundTransaction.updated_at
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .split('.')[0];
    this.OperationType = 'Refund';
    this.InvoiceId = originalTransaction.invoice_id;
    this.AccountId = originalTransaction.account_id;
    this.Email = null;
    this.Data = jsonData ? JSON.stringify(jsonData) : null;
    this.Rrn = originalTransaction.processing_ref_num;
    this.CustomFields = [];
  }
}

// Cancel уведомление
export class CancelHookDto {
  TransactionId: number;
  Amount: number;
  DateTime: string;
  InvoiceId?: string;
  AccountId?: string;
  Email?: string;
  Data?: string;
  Rrn?: string;

  constructor(
    transaction: transaction,
    jsonData?: any,
  ) {
    this.TransactionId = transaction.id;
    this.Amount = Number(transaction.amount);
    this.DateTime = transaction.updated_at
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '')
      .split('.')[0];
    this.InvoiceId = transaction.invoice_id;
    this.AccountId = transaction.account_id;
    this.Email = null;
    this.Data = jsonData ? JSON.stringify(jsonData) : null;
    this.Rrn = transaction.processing_ref_num;
  }
}

// Recurrent уведомление (пока заглушка, так как рекуррентные платежи не реализованы)
export class RecurrentHookDto {
  Id: string;
  AccountId: string;
  Description: string;
  Email: string;
  Amount: number;
  Currency: string;
  RequireConfirmation: boolean;
  StartDate: string;
  Interval: string;
  Period: number;
  Status: string;
  SuccessfulTransactionsNumber: number;
  FailedTransactionsNumber: number;
  MaxPeriods?: number;
  LastTransactionDate?: string;
  NextTransactionDate?: string;

  constructor(subscriptionData: any) {
    // Заглушка для будущей реализации подписок
    this.Id = subscriptionData.id;
    this.AccountId = subscriptionData.accountId;
    this.Description = subscriptionData.description;
    this.Email = subscriptionData.email;
    this.Amount = subscriptionData.amount;
    this.Currency = subscriptionData.currency || 'UZS';
    this.RequireConfirmation = subscriptionData.requireConfirmation || false;
    this.StartDate = subscriptionData.startDate;
    this.Interval = subscriptionData.interval;
    this.Period = subscriptionData.period;
    this.Status = subscriptionData.status;
    this.SuccessfulTransactionsNumber = subscriptionData.successfulTransactionsNumber || 0;
    this.FailedTransactionsNumber = subscriptionData.failedTransactionsNumber || 0;
    this.MaxPeriods = subscriptionData.maxPeriods;
    this.LastTransactionDate = subscriptionData.lastTransactionDate;
    this.NextTransactionDate = subscriptionData.nextTransactionDate;
  }
}