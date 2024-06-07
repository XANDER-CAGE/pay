import { processing_enum } from '@prisma/client';

export interface IDetermineProcessing {
  bankName: string;
  processing: processing_enum;
}
