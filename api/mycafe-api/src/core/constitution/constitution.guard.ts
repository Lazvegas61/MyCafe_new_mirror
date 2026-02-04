import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ConstitutionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (user?.role === 'GARSON' && request.path.includes('/reports')) {
      throw new ForbiddenException('K13 İHLAL: Garson rapor göremez');
    }

    const clientType = request.headers['x-client-type'];
    if (clientType === 'MOBILE' && request.path.includes('/finance')) {
      throw new ForbiddenException('K17 İHLAL: Mobil cihazdan finans işlemi yapılamaz');
    }

    if (user && user.sessionId) {
      const session = await this.prisma.userSession.findUnique({
        where: { id: user.sessionId, is_active: true },
      });
      
      if (!session || session.expires_at < new Date()) {
        throw new ForbiddenException('Oturum süresi doldu veya aktif değil');
      }
    }

    if (request.body && this.hasUICalculation(request.body)) {
      throw new BadRequestException('K01 İHLAL: UI hesaplama yapamaz');
    }

    return true;
  }

  private hasUICalculation(body: any): boolean {
    const forbiddenKeys = [
      'calculatedTotal',
      'calculatedDuration',
      'calculatedAmount',
      'computedPrice',
      'derivedTotal',
    ];
    
    return forbiddenKeys.some(key => body[key] !== undefined);
  }
}
