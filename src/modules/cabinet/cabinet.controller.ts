import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { CabinetService } from './cabinet.service';
import { TransactionListDto } from './dto/transaction-list.dto';
import { IAdminReq } from 'src/common/interfaces/adminReq.interface';
import { RefundDto } from '../payments/dto/refund.dto';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('cabinet')
export class CabinetController {
  constructor(
    private readonly cabinetService: CabinetService,
    private readonly paymentService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('transaction')
  async transactionList(
    @Query() dto: TransactionListDto,
    @Req() req: IAdminReq,
  ) {
    return this.cabinetService.transactionList(dto, req);
  }

  @Post('revert')
  async revert(@Body() dto: RefundDto, @Req() req: IAdminReq) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: +dto.TransactionId,
        cashbox: {
          is_active: true,
          company: {
            admins: {
              some: { admin: { id: req.adminId, deactivated_at: null } },
            },
          },
        },
      },
      include: { cashbox: true },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    await this.paymentService.refund(dto, transaction.cashbox.id);
    return { Success: true, Message: null };
  }
}
