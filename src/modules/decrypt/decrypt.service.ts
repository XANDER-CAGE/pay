import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IDecryptCardCryptogram } from 'src/common/interfaces/decryptCryptogram.interface';

@Injectable()
export class DecryptService {
  private readonly privateKeyPath: string;
  private readonly privateKeyPassword: string;
  constructor() {
    this.privateKeyPath = path.join(
      __dirname,
      '../../../certs/private_key.pem',
    );
    this.privateKeyPassword = 'bgtyhn123$';
  }

  decryptData(encryptedData: string) {
    try {
      const privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
      const decryptedData = crypto
        .privateDecrypt(
          {
            key: privateKey,
            passphrase: this.privateKeyPassword,
            padding: crypto.constants.RSA_PKCS1_PADDING,
          },
          Buffer.from(encryptedData, 'base64'),
        )
        .toString('utf8');

      return decryptedData;
    } catch (error) {
      console.error(error.message);
      throw new Error('Ошибка при расшифровке данных: ' + error.message);
    }
  }

  decryptCardCryptogram(cardCryptogramPacket: string): IDecryptCardCryptogram {
    const decodedData = Buffer.from(cardCryptogramPacket, 'base64').toString(
      'utf-8',
    );
    const obj = JSON.parse(decodedData);
    const decryptedCardData = this.decryptData(obj.Value);
    const decryptedDataParts = decryptedCardData.split('@');
    const decryptedLogin = decryptedDataParts[decryptedDataParts.length - 1];
    const [pan, expiry] = decryptedCardData.split('@');
    const formattedExpiry = this.formatExpDate(expiry);
    return { pan, decryptedLogin, expiry: formattedExpiry };
  }

  private formatExpDate(expiry: string): string {
    return expiry.length === 6
      ? expiry.substring(4) + expiry.substring(0, 2)
      : expiry;
  }
}
