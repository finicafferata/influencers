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
  ): Promise<{ id: string; email: string }> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('No email returned from Google OAuth profile');
    }

    const name = profile.displayName ?? undefined;
    const avatar = profile.photos?.[0]?.value ?? undefined;

    let user = await this.db.db.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.db.db.user.create({ data: { email, name, avatar } });
    } else if (!user.name) {
      // pre-fill name/avatar for magic-link-first users on first Google login
      user = await this.db.db.user.update({
        where: { id: user.id },
        data: {
          name: name ?? user.name,
          avatar: avatar ?? user.avatar,
        },
      });
    }

    return { id: user.id, email: user.email };
  }
}
