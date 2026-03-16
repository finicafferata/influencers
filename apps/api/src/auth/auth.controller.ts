import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendMagicLinkDto } from './dto/send-magic-link.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
