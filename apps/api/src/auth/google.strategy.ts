import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private db: DatabaseService) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    }
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL ?? 'http://localhost:3001'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<{ id: string; email: string; name: string | null; avatar: string | null }> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('No email returned from Google OAuth profile');
    }

    const name = profile.displayName ?? undefined;
    const avatar = profile.photos?.[0]?.value ?? undefined;

    const user = await this.db.db.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        avatar,
      },
    });

    return user;
  }
}
