import { card, transaction } from '@prisma/client';

export type OperationType = 'Payment' | 'Refund' | 'CardPayout';

export class HookDto {
  TransactionId: number;
  Amount: number;
  Currency: string;
  PaymentAmount: string;
  PaymentCurrency: string;
  DateTime: string;
  CardId: string;
  CardFirstSix: string;
  CardLastFour: string;
  CardType: string;
  CardExpDate: string;
  TestMode: number;
  Status: string;
  OperationType: string;
  InvoiceId: string;
  AccountId: string;

  constructor(
    transaction: transaction,
    card: card,
    operationType: OperationType,
  ) {
    const cardExp =
      card.expiry.substring(2) + '/' + card.expiry.substring(0, 2);
    this.AccountId = transaction.account_id;
    this.TransactionId = transaction.id;
    this.Amount = Number(transaction.amount);
    this.CardId = String(transaction.card_id);
    this.CardFirstSix = card.pan.slice(0, 6);
    this.CardLastFour = card.pan.slice(-4);
    this.CardType = card.processing;
    this.CardExpDate = cardExp;
    this.Currency = 'UZS';
    this.DateTime = String(transaction.created_at).replace('Z', '');
    this.InvoiceId = transaction.invoice_id;
    this.OperationType = operationType;
    this.PaymentAmount = String(transaction.amount);
    this.PaymentCurrency = '860';
    this.Status = transaction.status;
    this.TestMode = 0;
  }
}
