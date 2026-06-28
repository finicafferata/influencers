import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TrpcModule } from './trpc/trpc.module';
import { TrpcMiddleware } from './trpc/trpc.middleware';
import { EmailModule } from './email/email.module';

// Strict per-IP rate limiting in production; relaxed elsewhere so local dev and
// the e2e suite (many logins from one IP) aren't throttled. Override with THROTTLE_LIMIT.
const THROTTLE_LIMIT = Number(
  process.env.THROTTLE_LIMIT ??
    (process.env.NODE_ENV === 'production' ? 5 : 1000),
);

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: THROTTLE_LIMIT }]),
    DatabaseModule,
    TrpcModule,
    EmailModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TrpcMiddleware)
      // Express 5 / path-to-regexp v8 require named wildcards; the optional
      // group matches both `/trpc` and `/trpc/<procedure>`.
      .forRoutes({ path: '/trpc{/*path}', method: RequestMethod.ALL });
  }
}
