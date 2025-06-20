import { PayerDto } from 'src/common/interfaces/payer.interface';

export interface ICardsChargeData {
  ip: string;
  cardCryptoGramPacket: string;
  amount: number;
  currency?: string;
  invoiceId?: string;
  description?: string;
  accountId?: string;
  jsonData?: object;
  name?: string;
  paymentUrl?: string;
  cultureName?: string;
  email?: string;
  payer?: PayerDto;
  saveCard?: boolean;
  cashboxId: number;
}

export interface ICardsHold {
  ip: string;
  cardCryptoGramPacket: string;
  amount: number;
  currency?: string;
  invoiceId?: string;
  description?: string;
  accountId?: string;
  jsonData?: object;
  name?: string;
  paymentUrl?: string;
  cultureName?: string;
  email?: string;
  payer?: PayerDto;
  saveCard?: boolean;
  cashboxId: number;
}

export interface IHold {
  ip?: string;
  amount: number;
  currency?: string;
  invoiceId?: string;
  description?: string;
  accountId: string;
  cashboxId: number;
  token: string;
  organizationId: number;
  jsonData?: object;
  trInitiatorCode: 0 | 1;
  paymentScheduled?: 0 | 1;
  email?: string;
  payer?: PayerDto;
}

export interface IPayByToken {
  ip?: string;
  amount: number;
  currency?: string;
  invoiceId?: string;
  description?: string;
  accountId: string;
  cashboxId: number;
  token: string;
  organizationId: number;
  json_data?: object;
  trInitiatorCode: 0 | 1;
  paymentScheduled?: 0 | 1;
  email?: string;
  payer?: PayerDto;
}