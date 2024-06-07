import { card, cashbox, company, ip, payment } from '@prisma/client';

export interface IHandle3ds {
  payment: payment;
  cashbox: cashbox;
  company: company;
  pan: string;
  expiry: string;
  ip: ip;
  card: card;
}
