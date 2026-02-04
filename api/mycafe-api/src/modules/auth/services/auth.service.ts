import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../core/database/prisma.service';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (user && user.is_active && await bcrypt.compare(password, user.password_hash)) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    const tokenHash = await bcrypt.hash(token, 10);
    const session = await this.prisma.userSession.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
        is_active: true,
      },
    });

    return {
      access_token: token,
      session_id: session.id,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        cafe_id: user.cafe_id,
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { is_active: false },
    });
  }

  async validateSession(tokenHash: string): Promise<any> {
    const session = await this.prisma.userSession.findFirst({
      where: { 
        token_hash: tokenHash,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { last_activity: new Date() },
    });

    const { user, ...sessionInfo } = session;
    return {
      ...user,
      sessionId: session.id,
    };
  }
}
