import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SendMagicLinkDto } from './dto/send-magic-link.dto';

// Strict in production; relaxed in dev/test so the e2e suite (many logins from one
// IP) isn't throttled. Override with THROTTLE_LIMIT.
const MAGIC_LINK_LIMIT = Number(
  process.env.THROTTLE_LIMIT ??
    (process.env.NODE_ENV === 'production' ? 3 : 1000),
);

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('magic-link')
  @Throttle({ default: { limit: MAGIC_LINK_LIMIT, ttl: 60000 } })
  async sendLink(@Body() dto: SendMagicLinkDto): Promise<{ message: string }> {
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('verify')
  async verify(@Query('token') token: string): Promise<{ token: string }> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.verifyMagicLink(token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects to Google — no body needed
  }

  // Hand the JWT to the web app so it can set the cookie FIRST-PARTY (the
  // proxy model — REVIEW-01 C1). Setting the cookie here would put it on the
  // API origin, cross-site to the web app, where the browser won't send it.
  // Post-login routing is decided client-side via me.bootstrap (no isNewUser).
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(
    @Req() req: Request & { user: { id: string; email: string } },
    @Res() res: Response,
  ): void {
    const user = req.user;
    const jwt = this.jwtService.sign({ sub: user.id, email: user.email });
    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(
      `${webUrl}/auth/google/callback?token=${encodeURIComponent(jwt)}`,
    );
  }
}
