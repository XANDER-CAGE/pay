import { Request } from 'express';

export interface MyReq extends Request {
  basicAuthLogin: string;
  sessionId: number;
  cashboxId: number;
}
