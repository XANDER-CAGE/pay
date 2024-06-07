import { card, payment } from '@prisma/client';

export interface IRefund {
  card: card;
  payment: payment;
}
