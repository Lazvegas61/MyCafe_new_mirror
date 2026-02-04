import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../services/auth.service';

/**
 * 📜 ANAYASA K18:
 * JWT token DB'deki session ile doğrulanır.
 * Token tek başına yeterli değildir.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'mycafe-anayasa-secret',
      passReqToCallback: true,
    });
  }

  /**
   * 📜 K18: Token + DB session doğrulaması
   */
  async validate(req: any, payload: any) {
    // Token'ı header'dan al
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // Token hash'ini oluştur
    const tokenHash = await this.authService.createTokenHash(token);
    
    // 📜 K18: DB'de session kontrolü
    const user = await this.authService.validateSession(tokenHash);
    if (!user) {
      return null;
    }

    // 📜 K12: Rol bilgisi payload'dan değil, DB'den alınır
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      cafe_id: user.cafe_id,
      sessionId: user.sessionId,
    };
  }
}
