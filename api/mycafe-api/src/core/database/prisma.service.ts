import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService 
  extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy 
{
  constructor() {
    super({
      log: ['warn', 'error'], // Sadece warning ve error göster
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async executeTransaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }
}
