import { Injectable } from '@nestjs/common';
import { TransactionListDto } from './dto/transaction-list.dto';
import { IAdminReq } from 'src/common/interfaces/adminReq.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CabinetService {
  constructor(private readonly prisma: PrismaService) {}
  async transactionList(dto: TransactionListDto, req: IAdminReq) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        cashbox: {
          is_active: true,
          company: {
            admins: {
              some: { admin: { id: req.adminId, deactivated_at: null } },
            },
          },
        },
        created_at: { gte: dto.startDate, lte: dto.endDate },
        type: dto.transactionType,
        status: dto.transactionStatus,
      },
      orderBy: { created_at: 'desc' },
      take: dto.limit,
      skip: (dto.page - 1) * dto.limit,
    });
    return { username: req.adminUsername, transactions };
  }
}
