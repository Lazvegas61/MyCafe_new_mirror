import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dtos/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Kullanıcı girişi' })
  @ApiResponse({ status: 200, description: 'Giriş başarılı' })
  @ApiResponse({ status: 401, description: 'Geçersiz kimlik bilgileri' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcı çıkışı' })
  @ApiResponse({ status: 200, description: 'Çıkış başarılı' })
  async logout(@Request() req) {
    await this.authService.logout(req.user.sessionId);
    return { message: 'Çıkış başarılı' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanıcı bilgileri' })
  @ApiResponse({ status: 200, description: 'Kullanıcı bilgileri' })
  async getProfile(@Request() req) {
    return {
      user: req.user,
    };
  }
}
