import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, type Context } from '@repo/trpc';
import { DatabaseService } from '../database/database.service';
import { LlmService } from '../llm/llm.service';
import type { Request, Response } from 'express';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    private readonly llm: LlmService,
  ) {}

  /** Resolve the authenticated userId from the `session` cookie (or Bearer). */
  private resolveUserId(headers: Record<string, string>): string | undefined {
    let token: string | undefined;

    const cookieHeader = headers['cookie'];
    if (cookieHeader) {
      for (const part of cookieHeader.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === 'session') {
          // JWT is not percent-encoded by the setters; use the raw value.
          token = v.join('=');
          break;
        }
      }
    }
    if (!token) {
      const auth = headers['authorization'];
      if (auth?.startsWith('Bearer ')) token = auth.slice(7);
    }
    if (!token) return undefined;

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  async handleRequest(req: Request, res: Response) {
    const url = `http://localhost${req.url}`;
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(', ');
    }

    // NestJS registers body-parser globally, so by the time this middleware
    // runs the request stream is already drained and parsed onto req.body.
    // Re-serialize it (re-reading the stream would yield an empty body and
    // break every tRPC mutation). Fall back to reading the stream if, for some
    // configuration, the body wasn't parsed.
    const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
    let body: string | undefined;
    if (isWrite) {
      const parsed = (req as unknown as { body?: unknown }).body;
      if (
        parsed !== undefined &&
        parsed !== null &&
        !(typeof parsed === 'object' && Object.keys(parsed).length === 0)
      ) {
        body = JSON.stringify(parsed);
      } else {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', resolve);
          req.on('error', reject);
        });
        if (chunks.length) body = Buffer.concat(chunks).toString();
      }
    }

    const fetchReq = new Request(url, {
      method: req.method ?? 'GET',
      headers,
      body,
    });

    const userId = this.resolveUserId(headers);
    const ip =
      headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: fetchReq,
      router: appRouter,
      createContext: (): Context => ({
        userId,
        ip,
        db: this.db.db,
        llm: this.llm,
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
