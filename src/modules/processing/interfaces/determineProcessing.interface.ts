import { processing } from '@prisma/client';

export interface IDetermineProcessing {
  bankName: string;
  processing: processing;
}
