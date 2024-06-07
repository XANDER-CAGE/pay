import { CardType } from 'src/common/enum/cardType.enum';

export interface IValidate {
  cardData: {
    cardToken: string;
    pan: string;
    phone: string;
    fullname: string;
    cardType: CardType;
    bankName: string;
  };
  success: boolean;
}
