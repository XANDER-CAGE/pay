import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
// import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AdminGuard implements CanActivate {
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
    const [username, password] = credentials.split(':');
    const admin = await this.prisma.admin.findFirst({
      where: { username, password, deactivated_at: null },
    });
    if (!admin) throw new UnauthorizedException();

    request.adminId = admin.id;
    request.adminUsername = admin.username;
    return true;
  }
}
