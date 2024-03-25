import { Injectable } from '@nestjs/common';

@Injectable()
export class AcsService {
  decodeAReq(aReq: string) {
    return Buffer.from(aReq, 'base64').toString('utf-8');
  }
}
