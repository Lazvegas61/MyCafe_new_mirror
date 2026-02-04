import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/**
 * 📜 ANAYASA NOTU:
 * DatabaseModule GLOBAL'dir.
 * Tüm modüller doğrudan PostgreSQL'e bağlanır.
 * ORM KATMANI YOKTUR.
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
