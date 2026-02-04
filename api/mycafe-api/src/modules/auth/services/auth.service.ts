import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../../core/database/database.service';
import { LoginDto } from '../dtos/login.dto';

/**
 * 📜 ANAYASA KURALLARI:
 * K01: UI hesaplama yapamaz (bu service'te de yapılmaz)
 * K18: Session DB'de saklanır
 * K12: Rol ≠ Yetki (API + SQL kontrolü)
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {
    this.logger.log('🔐 AuthService: Anayasa uyumlu olarak başlatıldı');
  }

  /**
   * Kullanıcı doğrulama
   * 📜 K01: UI'dan gelen password hash'lenir, karşılaştırılır
   */
  async validateUser(username: string, password: string): Promise<any> {
    // 📜 K01: UI hiçbir hesaplama yapamaz, burada hash karşılaştırılır
    const user = await this.databaseService.findUserByUsername(username);
    
    if (!user) {
      this.logger.warn(`Geçersiz kullanıcı girişimi: ${username}`);
      return null;
    }

    // 📜 K01: Password karşılaştırması BACKEND'de
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      this.logger.warn(`Geçersiz şifre: ${username}`);
      return null;
    }

    // Password hash'ini response'tan çıkar
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Login işlemi
   * 📜 K18: Session DB'de oluşturulur
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;
    
    // 📜 K01: UI'dan "calculated" alanları kontrol et
    this.checkForUICalculations(loginDto);
    
    const user = await this.validateUser(username, password);
    
    if (!user) {
      throw new UnauthorizedException('Geçersiz kullanıcı adı veya şifre');
    }

    // JWT token oluştur
    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      cafe_id: user.cafe_id,
    });

    // Token hash'ini oluştur (DB'de saklamak için)
    const tokenHash = await this.createTokenHash(token);
    
    // 📜 K18: Session DB'de oluştur
    const session = await this.databaseService.createUserSession({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 saat
    });

    this.logger.log(`✅ Login başarılı: ${username} (${user.role})`);

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

  /**
   * Logout işlemi
   * 📜 K18: Session DB'de pasif yap
   */
  async logout(sessionId: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE usersession SET is_active = false WHERE id = $1`,
      [sessionId]
    );
    
    this.logger.log(`🔒 Logout: Session ${sessionId} sonlandırıldı`);
  }

  /**
   * Session doğrulama
   * 📜 K18: DB'de aktif session kontrolü
   */
  async validateSession(tokenHash: string): Promise<any> {
    const session = await this.databaseService.validateSession(tokenHash);
    
    if (!session) {
      return null;
    }

    return {
      id: session.user_id,
      username: session.username,
      role: session.role,
      cafe_id: session.cafe_id,
      sessionId: session.id,
    };
  }

  /**
   * Token hash oluşturma (JWT strategy için)
   */
  async createTokenHash(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  /**
   * 📜 K01: UI hesaplama kontrolü
   */
  private checkForUICalculations(dto: any): void {
    const forbiddenKeys = [
      'calculatedTotal', 'calculatedAmount', 'computedPrice',
      'derivedTotal', 'sum', 'reduce', 'map'
    ];
    
    const dtoString = JSON.stringify(dto).toLowerCase();
    
    for (const key of forbiddenKeys) {
      if (dtoString.includes(key.toLowerCase())) {
        throw new Error(`K01 İHLAL: UI hesaplama yapamaz. Yasaklı alan: ${key}`);
      }
    }
  }
}
