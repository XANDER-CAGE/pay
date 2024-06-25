export interface ISendSuccessSms {
  balance: string;
  amount: number;
  cashboxName: string;
  pan: string;
  phone: string;
  processing: 'uzcard' | 'humo' | 'visa' | 'mastercard' | 'mir' | 'unionpay';
}
