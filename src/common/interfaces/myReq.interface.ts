import { cashbox, company } from '@prisma/client';
import { Request } from 'express';

export interface MyReq extends Request {
  basicAuthLogin: string;
  sessionId: number;
  cashboxId: number;
  organizationId: number;
  cashbox: cashbox;
  company: company;
}
