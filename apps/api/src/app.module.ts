import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TrpcModule } from './trpc/trpc.module';
import { TrpcMiddleware } from './trpc/trpc.middleware';

@Module({
  imports: [DatabaseModule, TrpcModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TrpcMiddleware)
      .forRoutes({ path: '/trpc*', method: RequestMethod.ALL });
  }
}
