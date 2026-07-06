import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@repo/db';
import type { PrismaClientExtended } from '@repo/db';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  protected readonly client: PrismaClientExtended = prisma;

  get db(): PrismaClientExtended {
    return this.client;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
