import { card, transaction } from '@prisma/client';

export interface IRefund {
  card: card;
  transaction: transaction;
}
