import { card, cashbox, company, ip, transaction } from '@prisma/client';

export interface IPayByToken {
  ip: ip;
  cashbox: cashbox;
  pan: string;
  card: card;
  transaction: transaction;
  expiry: string;
  company: company;
}
