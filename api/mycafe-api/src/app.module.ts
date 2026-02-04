import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConstitutionGuard } from './core/constitution/constitution.guard';
import { ValidationPipe } from './core/constitution/validation.pipe';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ConstitutionGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
