import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { LlmModule } from '../llm/llm.module';
import { TrpcRouter } from './trpc.router';

@Module({
  imports: [
    DatabaseModule,
    LlmModule, // must be imported HERE (TrpcRouter lives in this module) for DI to resolve LlmService
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret)
          throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
  ],
  providers: [TrpcRouter],
  exports: [TrpcRouter],
})
export class TrpcModule {}
