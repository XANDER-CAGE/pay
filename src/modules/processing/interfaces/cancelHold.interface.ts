import { card, payment } from '@prisma/client';

export interface ICancelHold {
  payment: payment;
  card: card;
}
