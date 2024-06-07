import { card, cashbox, ip, payment } from '@prisma/client';

export interface IHold {
  cashbox: cashbox;
  pan: string;
  expiry: string;
  payment: payment;
  card: card;
  ip: ip;
}
