import { card, cashbox, payment } from '@prisma/client';

export interface IConfirmHold {
  cashbox: cashbox;
  card: card;
  payment: payment;
  amount: number;
}
