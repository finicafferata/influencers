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
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import { SendMagicLinkDto } from './dto/send-magic-link.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  @Post('magic-link')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async sendLink(
    @Body() dto: SendMagicLinkDto,
  ): Promise<{ message: string }> {
    return this.authService.sendMagicLink(dto.email);
  }

  @Get('verify')
  async verify(
    @Query('token') token: string,
  ): Promise<{ token: string; isNewUser: boolean }> {
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

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request & { user: { id: string; email: string } },
    @Res() res: Response,
  ): Promise<void> {
    const user = req.user;

    const profile = await this.db.db.creatorProfile.findUnique({
      where: { userId: user.id },
    });
    const orgMember = await this.db.db.organizationMember.findFirst({
      where: { userId: user.id },
    });
    const isNewUser = !profile && !orgMember;

    const jwt = this.jwtService.sign({ sub: user.id, email: user.email });

    res.cookie('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const webUrl = process.env.WEB_URL ?? 'http://localhost:3000';
    res.redirect(isNewUser ? `${webUrl}/onboarding/role` : `${webUrl}/dashboard`);
  }
}
