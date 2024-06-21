import { card, cashbox, transaction } from '@prisma/client';

export interface IConfirmHold {
  cashbox: cashbox;
  card: card;
  transaction: transaction;
  amount: number;
}
