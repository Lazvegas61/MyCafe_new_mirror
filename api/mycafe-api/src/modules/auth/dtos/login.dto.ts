import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'admin',
    description: 'Kullanıcı adı'
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ 
    example: 'admin123',
    description: 'Şifre (minimum 6 karakter)'
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
