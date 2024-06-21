import { card, cashbox, ip, transaction } from '@prisma/client';

export interface IHold {
  cashbox: cashbox;
  pan: string;
  expiry: string;
  transaction: transaction;
  card: card;
  ip: ip;
}
