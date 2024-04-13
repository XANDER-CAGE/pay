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
import { RefundDto } from './dto/refund.dto';
import { PayByTokenDto } from './dto/payByToken.dto';
import { CoreApiResponse } from 'src/common/classes/model.class';

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

  async handle3DSPost(dto: Handle3dsPostDto): Promise<CoreApiResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: +dto.TransactionId },
    });
    if (!payment) {
      throw new NotFoundException('Transaction not found.');
    }
    if (payment.status !== 'Authorized') {
      throw new NotAcceptableException('Transaction not authorized');
    }
    const { pan } = this.decryptService.decryptCardCryptogram(
      payment.card_cryptogram_packet,
    );
    const data = await this.processingService.handle3dsPost(payment, pan);
    return data;
  }

  async refund(dto: RefundDto) {
    await this.processingService.refund(+dto.TransactionId);
    return {
      Model: {
        TransactionId: dto.TransactionId,
      },
      Success: true,
      Message: null,
    };
  }

  async payByToken(dto: PayByTokenDto, req: MyReq): Promise<CoreApiResponse> {
    const data = await this.processingService.payByCard(dto, req);
    return data;
  }

  async getDataByByTransactionId(transactionId: number) {
    return await this.processingService.getDataByTransactionId(transactionId);
  }
}
