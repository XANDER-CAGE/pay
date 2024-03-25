import {
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentChargeDto } from './dto/payment-charge.dto';
import { MyReq } from 'src/common/interfaces/myReq.interface';
import { LocationService } from './getGeoLocation.service';
import { ProcessingService } from '../processing/processing.service';
import { DecryptService } from '../decrypt/decrypt.service';
import { Handle3dsPostDto } from './dto/handle3dsPost.dto';
import { CardType } from 'src/common/enum/cardType.enum';

interface IHandle3dsPost {
  Amount: number;
  Currency: string;
  PublicId: string;
  AccountId: string;
  TransactionId: bigint;
  InvoiceId: string;
  IpAddress: string;
  CardFirstSix: string;
  CardLastFour: string;
  CreatedDate: number;
  CreatedDateIso: string;
  CardHolderName: string;
  CardToken: string;
  Status: string;
  Success: boolean;
  BankName?: string;
  Reason?: string | null;
  IpCountry: string;
  CardExpDate: string;
  CardType: CardType;
  IpCity: string;
  IpRegion: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly processingService: ProcessingService,
    private readonly decryptService: DecryptService,
  ) {}
  async charge(dto: PaymentChargeDto, req: MyReq) {
    const { decryptedLogin, expiry, pan } =
      this.decryptService.decryptCardCryptogram(dto.CardCryptogramPacket);
    if (req.basicAuthLogin !== decryptedLogin) {
      throw new NotAcceptableException({
        success: false,
        code: 11, // Некорректный AccountId
        error:
          'Basic Auth login does not match the login in the card cryptogram.',
      });
    }
    const ipLocationData = await this.locationService.getLocationByIP(req.ip);
    const payment = await this.prisma.payment.create({
      data: {
        amount: dto.Amount,
        currency: 'UZS',
        invoice_id: dto.InvoiceId,
        ip_address: req.ip,
        description: dto.Description,
        account_id: dto.AccountId,
        name: dto.Name,
        card_cryptogram_packet: dto.CardCryptogramPacket,
        cashbox_id: req.cashboxId,
        ip_country: ipLocationData.country,
        ip_city: ipLocationData.city,
        ip_region: ipLocationData.region,
        status: 'Init',
      },
    });

    // TODO review why we should save payer
    if (dto.Payer) {
      await this.prisma.payer.create({
        data: {
          first_name: dto.Payer.FirstName,
          last_name: dto.Payer.LastName,
          middle_name: dto.Payer.MiddleName,
          birth: dto.Payer.Birth,
          address: dto.Payer.Address,
          street: dto.Payer.Street,
          city: dto.Payer.City,
          country: dto.Payer.Country,
          phone: dto.Payer.Phone,
          postcode: dto.Payer.Postcode,
        },
      });
    }
    const { otpId, phone } = await this.processingService.sendOtp(pan, expiry);
    const customData = {
      Currency: 'UZS',
      Amount: dto.Amount.toString(),
      Description: dto.Description || null,
      id: otpId,
      phone,
    };
    const customDataEncoded = Buffer.from(JSON.stringify(customData)).toString(
      'base64',
    );

    // TODO review this return
    return {
      Model: {
        TransactionId: payment.id,
        PaReq: customDataEncoded,
        AcsUrl: process.env.CURRENT_API_URL + '/check_areq',
        ThreeDsCallbackId: '7be4d37f0a434c0a8a7fc0e328368d7d',
        IFrameIsAllowed: true,
      },
      Success: false, //special for jet merchant
      Message: null,
    };
  }

  async handle3DSPost(dto: Handle3dsPostDto): Promise<IHandle3dsPost> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: dto.TransactionId },
    });
    if (!payment) {
      throw new NotFoundException('Transaction not found.');
    }
    if (payment.status !== 'Authorized') {
      throw new NotAcceptableException('Transaction not authorized');
    }
    const { pan, expiry } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const success = await this.processingService.handle3dsPost(payment, pan);
    const date = new Date(payment.created_at);
    return {
      Amount: Number(payment.amount),
      Currency: payment.currency,
      PublicId: success.PublicId,
      AccountId: success.AccountId,
      TransactionId: payment.id,
      InvoiceId: payment.invoice_id,
      IpAddress: payment.ip_address,
      CardFirstSix: success.CardFirstSix,
      CardLastFour: success.CardLastFour,
      CreatedDate: date.getTime(),
      CreatedDateIso: date.toISOString(),
      CardHolderName: success.CardHolderName,
      CardToken: success.CardToken,
      Status: success.Status,
      Success: success.Success,
      BankName: success.BankName,
      Reason: success.Reason || null,
      IpCountry: payment.ip_country,
      IpCity: payment.ip_city,
      IpRegion: payment.ip_region,
      CardExpDate: expiry,
      CardType: success.Processing,
    };
  }
}
