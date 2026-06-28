import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret)
          throw new Error('JWT_SECRET environment variable is required');
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
    DatabaseModule,
    EmailModule,
  ],
  controllers: [AuthController],
  // Google OAuth is optional: only register the strategy when creds are present
  // so magic-link login works without GOOGLE_CLIENT_ID/SECRET (see docs/LOCAL-DEV.md).
  providers: [
    AuthService,
    JwtStrategy,
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleStrategy]
      : []),
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
