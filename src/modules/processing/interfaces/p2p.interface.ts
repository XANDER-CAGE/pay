import { card } from '@prisma/client';

export interface IP2P {
  senderCard: card;
  receiverPan: string;
  amount: number;
  transactionId: number;
  cashboxId: number;
}

export interface IP2PRes {
  success: boolean;
  message: string;
  code: number;
  refNum: string;
}
