import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException(
        'You do not have permission to view this directory or page.',
      );
    }
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [public_id, password_api] = credentials.split(':');
    const cashbox = await this.prisma.cashbox.findFirst({
      where: { public_id, password_api, status: 'active' },
    });
    if (!cashbox) {
      throw new UnauthorizedException({
        success: false,
        code: 11,
        error: 'InvalidAccountId',
      });
    }
    if (cashbox.status === 'deactive') {
      throw new ForbiddenException('Учетная запись деактивирована');
    }
    let session = await this.prisma.session.findFirst({
      where: {
        cashbox_id: cashbox.id,
      },
    });
    if (session) {
      await this.prisma.session.update({
        where: {
          id: session.id,
        },
        data: {
          sid: uuidv4(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    } else {
      session = await this.prisma.session.create({
        data: {
          cashbox_id: cashbox.id,
          sid: uuidv4(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
    request.basicAuthLogin = public_id;
    request.cashboxId = cashbox.id;
    request.sessionId = session.id;
    return true;
  }
}
