import { card, transaction } from '@prisma/client';

export type OperationType = 'Payment' | 'Refund' | 'CardPayout';
function formatDate(date) {
  function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
  }
  const year = date.getFullYear();
  const month = padTo2Digits(date.getMonth() + 1);
  const day = padTo2Digits(date.getDate());
  const hours = padTo2Digits(date.getHours());
  const minutes = padTo2Digits(date.getMinutes());
  const seconds = padTo2Digits(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
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
  TestMode: boolean;
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
    this.DateTime = formatDate(transaction.created_at);
    this.InvoiceId = transaction.invoice_id;
    this.OperationType = operationType;
    this.PaymentAmount = String(transaction.amount);
    this.PaymentCurrency = '860';
    this.Status = transaction.status;
    this.TestMode = transaction.is_test;
  }
}
