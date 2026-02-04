import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'mycafe-secret-key',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const user = await this.authService.validateSession(token);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      cafe_id: user.cafe_id,
      sessionId: user.sessionId,
    };
  }
}
