import { Injectable } from '@nestjs/common';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, type Context } from '@repo/trpc';
import { DatabaseService } from '../database/database.service';
import type { Request, Response } from 'express';

@Injectable()
export class TrpcRouter {
  constructor(private readonly db: DatabaseService) {}

  async handleRequest(req: Request, res: Response) {
    const url = `http://localhost${req.url}`;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(', ');
    }

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const body = chunks.length ? Buffer.concat(chunks).toString() : undefined;

    const fetchReq = new Request(url, {
      method: req.method ?? 'GET',
      headers,
      body: body && req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    });

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: fetchReq,
      router: appRouter,
      createContext: (): Context => ({
        userId: undefined,
        db: this.db.db,
      }),
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const responseBody = await response.text();
    res.end(responseBody);
  }
}
