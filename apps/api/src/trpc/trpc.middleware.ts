import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TrpcRouter } from './trpc.router';

@Injectable()
export class TrpcMiddleware implements NestMiddleware {
  constructor(private readonly trpcRouter: TrpcRouter) {}

  use(req: Request, res: Response, _next: NextFunction) {
    return this.trpcRouter.handleRequest(req as any, res as any);
  }
}
