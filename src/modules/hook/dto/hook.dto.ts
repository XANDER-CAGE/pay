import { card, payment } from '@prisma/client';

export type OperationType = 'Payment' | 'Refund' | 'CardPayout';

export class HookDto {
  TransactionId: number;
  Amount: number;
  Currency: string;
  PaymentAmount: string;
  PaymentCurrency: string;
  DateTime: Date;
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

  constructor(payment: payment, card: card, operationType: OperationType) {
    const cardExp =
      card.expiry.substring(2) + '/' + card.expiry.substring(0, 2);
    this.AccountId = payment.account_id;
    this.TransactionId = payment.id;
    this.Amount = Number(payment.amount);
    this.CardId = String(payment.card_id);
    this.CardFirstSix = card.masked_pan.slice(0, 6);
    this.CardLastFour = card.masked_pan.slice(-4);
    this.CardType = card.processing;
    this.CardExpDate = cardExp;
    this.Currency = 'UZS';
    this.DateTime = payment.created_at;
    this.InvoiceId = payment.invoice_id;
    this.OperationType = operationType;
    this.PaymentAmount = String(payment.amount);
    this.PaymentCurrency = '860';
    this.Status = payment.status;
    this.TestMode = 0;
  }
}
