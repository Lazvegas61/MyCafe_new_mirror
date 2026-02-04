import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ConstitutionGuard implements CanActivate {
  constructor(private databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    // K13: Garson rapor göremez
    if (user?.role === 'GARSON' && request.path.includes('/reports')) {
      throw new ForbiddenException('K13 İHLAL: Garson rapor göremez');
    }

    // K17: Mobil'den finans işlemi yapılamaz
    const clientType = request.headers['x-client-type'];
    if (clientType === 'MOBILE' && request.path.includes('/finance')) {
      throw new ForbiddenException('K17 İHLAL: Mobil cihazdan finans işlemi yapılamaz');
    }

    // K18: Oturum kontrolü (Auth'dan sonra aktif)
    if (user && user.sessionId) {
      const session = await this.databaseService.validateSession(user.sessionId);
      
      if (!session) {
        throw new ForbiddenException('Oturum süresi doldu veya aktif değil');
      }
    }

    // K01: UI hesaplama kontrolü
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
