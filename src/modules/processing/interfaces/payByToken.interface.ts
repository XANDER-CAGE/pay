import { card, cashbox, company, ip, payment } from '@prisma/client';

export interface IPayByToken {
  ip: ip;
  cashbox: cashbox;
  pan: string;
  card: card;
  payment: payment;
  expiry: string;
  company: company;
}
