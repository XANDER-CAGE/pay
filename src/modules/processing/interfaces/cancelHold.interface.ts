import { card, transaction } from '@prisma/client';

export interface ICancelHold {
  transaction: transaction;
  card: card;
}
