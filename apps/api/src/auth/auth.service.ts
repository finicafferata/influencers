import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  async sendMagicLink(email: string): Promise<{ message: string }> {
    const user = await this.db.db.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.db.db.magicLinkToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const appUrl = process.env.APP_URL ?? 'https://app.creatorlink.app';
    const link = `${appUrl}/auth/verify?token=${token}`;

    await this.email.sendMagicLink(email, link);

    return { message: 'Magic link sent' };
  }

  // Returns only the session JWT. Post-login routing is decided by the
  // client via `me.bootstrap` (REVIEW-01 C2 — `isNewUser` removed).
  async verifyMagicLink(token: string): Promise<{ token: string }> {
    const record = await this.db.db.magicLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (record.used) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const signedJwt = this.jwt.sign({
      sub: record.user.id,
      email: record.user.email,
    });

    await this.db.db.magicLinkToken.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { token: signedJwt };
  }
}
