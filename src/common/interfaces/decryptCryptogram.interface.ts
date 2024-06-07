export interface IDecryptCardCryptogram {
  success: boolean;
  decryptedData: {
    pan: string;
    expiry: string;
    decryptedLogin: string;
  };
}
