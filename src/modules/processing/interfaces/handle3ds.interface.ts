import { card, cashbox, company, ip, transaction } from '@prisma/client';

export interface IHandle3ds {
  transaction: transaction;
  cashbox: cashbox;
  company: company;
  pan: string;
  expiry: string;
  ip: ip;
  card: card;
}
