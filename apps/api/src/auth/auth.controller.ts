import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('magic-link')
  async sendLink(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.sendMagicLink(email);
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
}
